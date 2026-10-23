import { and, eq, inArray, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { rosterLimit } from "@/core/roster";
import { SLOT_BENCH } from "@/core/types";
import { validateTrade } from "@/core/waivers";
import { logTransaction, UserError, type League } from "./leagues";

const { trades, tradeItems, rosterEntries, teams, players } = schema;

export async function proposeTrade(input: {
  league: League;
  fromTeamId: string;
  toTeamId: string;
  give: string[];
  get: string[];
  note?: string;
}) {
  if (!["active", "playoffs"].includes(input.league.status)) throw new UserError("Trades open after the draft.");
  if (input.fromTeamId === input.toTeamId) throw new UserError("Pick another team to trade with.");
  if (!input.give.length || !input.get.length) throw new UserError("Pick at least one player on each side.");
  const entries = await db
    .select()
    .from(rosterEntries)
    .where(and(eq(rosterEntries.leagueId, input.league.id), inArray(rosterEntries.playerId, [...input.give, ...input.get])));
  const owner = new Map(entries.map((e) => [e.playerId, e.teamId]));
  if (input.give.some((p) => owner.get(p) !== input.fromTeamId)) throw new UserError("You can only offer players on your team.");
  if (input.get.some((p) => owner.get(p) !== input.toTeamId)) throw new UserError("They don't own one of those players.");

  await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(trades)
      .values({
        leagueId: input.league.id,
        proposerTeamId: input.fromTeamId,
        targetTeamId: input.toTeamId,
        note: input.note?.slice(0, 280) ?? null,
        expiresAt: new Date(Date.now() + input.league.settings.tradeExpiryHours * 3_600_000),
      })
      .returning({ id: trades.id });
    await tx.insert(tradeItems).values([
      ...input.give.map((p) => ({ tradeId: t.id, playerId: p, fromTeamId: input.fromTeamId, toTeamId: input.toTeamId })),
      ...input.get.map((p) => ({ tradeId: t.id, playerId: p, fromTeamId: input.toTeamId, toTeamId: input.fromTeamId })),
    ]);
    await logTransaction(tx, input.league.id, "trade", { action: "proposed", tradeId: t.id }, { teamId: input.fromTeamId });
  });
}

/** Re-checks ownership and roster sizes, then swaps players in a single transaction. */
async function applyTrade(league: League, tradeId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [trade] = await tx.select().from(trades).where(eq(trades.id, tradeId)).for("update");
    if (!trade || !["pending", "review"].includes(trade.status)) throw new UserError("This trade is no longer open.");
    const items = await tx.select().from(tradeItems).where(eq(tradeItems.tradeId, tradeId));
    // Lock both rosters' rows by reading them inside the transaction.
    const entries = await tx.select().from(rosterEntries).where(eq(rosterEntries.leagueId, league.id)).for("update");
    const owned = new Map(entries.map((e) => [e.playerId, e.teamId]));
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.teamId, (counts.get(e.teamId) ?? 0) + 1);
    const check = validateTrade({ owned, items, rosterCounts: counts, rosterLimit: rosterLimit(league.settings) });
    if (!check.ok) {
      await tx.update(trades).set({ status: "invalid", resolvedAt: new Date() }).where(eq(trades.id, tradeId));
      throw new UserError(check.reason);
    }
    const now = new Date();
    for (const it of items) {
      await tx
        .update(rosterEntries)
        .set({ teamId: it.toTeamId, slot: SLOT_BENCH, acquiredAt: now })
        .where(and(eq(rosterEntries.leagueId, league.id), eq(rosterEntries.playerId, it.playerId)));
    }
    await tx.update(trades).set({ status: "accepted", resolvedAt: now }).where(eq(trades.id, tradeId));
    // Any other open trade touching these players is now stale.
    const movedIds = items.map((i) => i.playerId);
    const stale = await tx
      .select({ id: tradeItems.tradeId })
      .from(tradeItems)
      .innerJoin(trades, eq(trades.id, tradeItems.tradeId))
      .where(and(inArray(tradeItems.playerId, movedIds), inArray(trades.status, ["pending", "review"])));
    const staleIds = stale.map((s) => s.id).filter((id) => id !== tradeId);
    if (staleIds.length) await tx.update(trades).set({ status: "invalid", resolvedAt: now }).where(inArray(trades.id, staleIds));
    await logTransaction(tx, league.id, "trade", { action: "completed", tradeId }, { teamId: trade.proposerTeamId });
  });
}

export async function respondToTrade(input: { league: League; teamId: string; tradeId: string; accept: boolean }) {
  const [trade] = await db.select().from(trades).where(and(eq(trades.id, input.tradeId), eq(trades.leagueId, input.league.id)));
  if (!trade || trade.status !== "pending") throw new UserError("This trade is no longer open.");
  if (trade.targetTeamId !== input.teamId) throw new UserError("Only the team receiving the offer can answer it.");
  if (trade.expiresAt < new Date()) {
    await db.update(trades).set({ status: "expired", resolvedAt: new Date() }).where(eq(trades.id, trade.id));
    throw new UserError("This offer expired.");
  }
  if (!input.accept) {
    await db.update(trades).set({ status: "rejected", resolvedAt: new Date() }).where(eq(trades.id, trade.id));
    return;
  }
  if (input.league.settings.tradeReview === "commissioner") {
    await db.update(trades).set({ status: "review" }).where(eq(trades.id, trade.id));
    return;
  }
  await applyTrade(input.league, trade.id);
}

export async function cancelTrade(input: { league: League; teamId: string; tradeId: string }) {
  await db
    .update(trades)
    .set({ status: "cancelled", resolvedAt: new Date() })
    .where(and(eq(trades.id, input.tradeId), eq(trades.proposerTeamId, input.teamId), inArray(trades.status, ["pending"])));
}

export async function commissionerReview(input: { league: League; tradeId: string; approve: boolean }) {
  const [trade] = await db.select().from(trades).where(and(eq(trades.id, input.tradeId), eq(trades.leagueId, input.league.id)));
  if (!trade || trade.status !== "review") throw new UserError("Nothing to review.");
  if (!input.approve) {
    await db.update(trades).set({ status: "vetoed", resolvedAt: new Date() }).where(eq(trades.id, trade.id));
    return;
  }
  await applyTrade(input.league, trade.id);
}

export async function expireTrades(leagueId: string, now = new Date()) {
  await db
    .update(trades)
    .set({ status: "expired", resolvedAt: now })
    .where(and(eq(trades.leagueId, leagueId), eq(trades.status, "pending"), lt(trades.expiresAt, now)));
}

export async function leagueTrades(leagueId: string) {
  const rows = await db.select().from(trades).where(eq(trades.leagueId, leagueId));
  const items = rows.length
    ? await db
        .select({ item: tradeItems, player: players })
        .from(tradeItems)
        .innerJoin(players, eq(players.id, tradeItems.playerId))
        .where(inArray(tradeItems.tradeId, rows.map((r) => r.id)))
    : [];
  const teamRows = await db.select().from(teams).where(eq(teams.leagueId, leagueId));
  return rows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((t) => ({ trade: t, items: items.filter((i) => i.item.tradeId === t.id), teams: teamRows }));
}


