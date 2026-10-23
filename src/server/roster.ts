import { and, asc, eq, ilike, notInArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { firstOpenSlot, rosterLimit, validateLineup } from "@/core/roster";

import { logTransaction, UserError, type League } from "./leagues";
import { currentWeek } from "./engine";
import { playerRankings } from "./rankings";

const { players, rosterEntries, weeklyLocks, waiverHolds } = schema;

function requirePlayableSeason(league: League) {
  if (!["active", "playoffs"].includes(league.status)) throw new UserError("Rosters can be changed once the draft is done.");
}

export async function teamRoster(teamId: string) {
  return db
    .select({ entry: rosterEntries, player: players })
    .from(rosterEntries)
    .innerJoin(players, eq(players.id, rosterEntries.playerId))
    .where(eq(rosterEntries.teamId, teamId))
    .orderBy(asc(rosterEntries.acquiredAt));
}

/** Set the full lineup in one go: [{playerId, slot}]. Locked players cannot move this week. */
export async function setLineup(input: { league: League; teamId: string; userId: string; assignments: { playerId: string; slot: string }[] }) {
  requirePlayableSeason(input.league);
  const rows = await teamRoster(input.teamId);
  const byPlayer = new Map(rows.map((r) => [r.player.id, r]));
  const wanted = new Map(input.assignments.map((a) => [a.playerId, a.slot]));
  for (const id of wanted.keys()) if (!byPlayer.has(id)) throw new UserError("That player is not on your team.");

  const week = currentWeek(input.league);
  const locks =
    week >= 1
      ? await db
          .select()
          .from(weeklyLocks)
          .where(and(eq(weeklyLocks.teamId, input.teamId), eq(weeklyLocks.week, week)))
      : [];
  const locked = new Set(locks.map((l) => l.playerId));

  const finalRows = rows.map((r) => ({
    playerId: r.player.id,
    position: r.player.position,
    slot: wanted.get(r.player.id) ?? r.entry.slot,
  }));
  for (const r of finalRows) {
    const was = byPlayer.get(r.playerId)!.entry.slot;
    if (locked.has(r.playerId) && r.slot !== was) throw new UserError("A locked-in player can't be moved until next week.");
  }
  const err = validateLineup(finalRows, input.league.settings);
  if (err) throw new UserError(err);

  await db.transaction(async (tx) => {
    for (const r of finalRows) {
      const was = byPlayer.get(r.playerId)!.entry.slot;
      if (was !== r.slot) await tx.update(rosterEntries).set({ slot: r.slot }).where(eq(rosterEntries.id, byPlayer.get(r.playerId)!.entry.id));
    }
    await logTransaction(tx, input.league.id, "lineup", { moves: finalRows.length }, { teamId: input.teamId, userId: input.userId });
  });
}

export async function addFreeAgent(input: {
  league: League;
  teamId: string;
  userId: string;
  playerId: string;
  dropPlayerId?: string | null;
}) {
  requirePlayableSeason(input.league);
  const now = new Date();
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ entry: rosterEntries, player: players })
      .from(rosterEntries)
      .innerJoin(players, eq(players.id, rosterEntries.playerId))
      .where(eq(rosterEntries.teamId, input.teamId));
    const [target] = await tx.select().from(players).where(eq(players.id, input.playerId));
    if (!target || !target.isActive) throw new UserError("That player isn't available.");
    const [hold] = await tx
      .select()
      .from(waiverHolds)
      .where(and(eq(waiverHolds.leagueId, input.league.id), eq(waiverHolds.playerId, input.playerId)));
    if (hold && hold.until > now) throw new UserError("That player is on waivers. Submit a claim instead.");

    let current = rows;
    if (input.dropPlayerId) {
      const drop = rows.find((r) => r.player.id === input.dropPlayerId);
      if (!drop) throw new UserError("The player you're dropping isn't on your team.");
      await tx.delete(rosterEntries).where(eq(rosterEntries.id, drop.entry.id));
      await tx
        .insert(waiverHolds)
        .values({ leagueId: input.league.id, playerId: drop.player.id, until: new Date(now.getTime() + input.league.settings.waiverHoldHours * 3_600_000) })
        .onConflictDoUpdate({ target: [waiverHolds.leagueId, waiverHolds.playerId], set: { until: sql`excluded.until` } });
      current = rows.filter((r) => r.player.id !== input.dropPlayerId);
    }
    if (current.length >= rosterLimit(input.league.settings)) throw new UserError("Your roster is full. Pick a player to drop.");
    const slot = firstOpenSlot(
      current.map((r) => ({ playerId: r.player.id, slot: r.entry.slot, position: r.player.position })),
      target.position,
      input.league.settings,
    );
    try {
      await tx.insert(rosterEntries).values({ leagueId: input.league.id, teamId: input.teamId, playerId: target.id, slot });
    } catch (e) {
      if (String((e as { cause?: Error }).cause?.message ?? e).includes("roster_league_player_uq")) throw new UserError("Someone else just added that player.");
      throw e;
    }
    await tx.delete(waiverHolds).where(and(eq(waiverHolds.leagueId, input.league.id), eq(waiverHolds.playerId, target.id)));
    await logTransaction(tx, input.league.id, "add", { playerId: target.id, name: target.name, dropped: input.dropPlayerId ?? null }, { teamId: input.teamId, userId: input.userId });
  });
}

export async function dropPlayer(input: { league: League; teamId: string; userId: string; playerId: string }) {
  requirePlayableSeason(input.league);
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(rosterEntries)
      .where(and(eq(rosterEntries.teamId, input.teamId), eq(rosterEntries.playerId, input.playerId)));
    if (!row) throw new UserError("That player isn't on your team.");
    await tx.delete(rosterEntries).where(eq(rosterEntries.id, row.id));
    await tx
      .insert(waiverHolds)
      .values({ leagueId: input.league.id, playerId: input.playerId, until: new Date(Date.now() + input.league.settings.waiverHoldHours * 3_600_000) })
      .onConflictDoUpdate({ target: [waiverHolds.leagueId, waiverHolds.playerId], set: { until: sql`excluded.until` } });
    await logTransaction(tx, input.league.id, "drop", { playerId: input.playerId }, { teamId: input.teamId, userId: input.userId });
  });
}

export type PoolPlayer = {
  id: string;
  espnId: string;
  name: string;
  teamAbbr: string | null;
  position: string | null;
  imageUrl: string | null;
  injuryStatus: string | null;
  gp: number;
  avg: number;
  onWaivers: boolean;
};

/** Players not on any roster in this league, best first. */
export async function playerPool(league: League, opts: { q?: string; position?: string; limit?: number; excludeIds?: string[] } = {}): Promise<PoolPlayer[]> {
  const owned = await db.select({ id: rosterEntries.playerId }).from(rosterEntries).where(eq(rosterEntries.leagueId, league.id));
  const exclude = [...owned.map((o) => o.id), ...(opts.excludeIds ?? [])];
  const conds = [eq(players.isActive, true)];
  if (exclude.length) conds.push(notInArray(players.id, exclude));
  if (opts.q) conds.push(or(ilike(players.name, `%${opts.q}%`), ilike(players.teamAbbr, opts.q))!);
  if (opts.position) conds.push(eq(players.position, opts.position));
  const [rows, ranks, holds] = await Promise.all([
    db.select().from(players).where(and(...conds)),
    playerRankings(league.settings.scoring),
    db.select().from(waiverHolds).where(eq(waiverHolds.leagueId, league.id)),
  ]);
  const held = new Set(holds.filter((h) => h.until > new Date()).map((h) => h.playerId));
  return rows
    .map((p) => {
      const r = ranks.get(p.espnId);
      return {
        id: p.id,
        espnId: p.espnId,
        name: p.name,
        teamAbbr: p.teamAbbr,
        position: p.position,
        imageUrl: p.imageUrl,
        injuryStatus: p.injuryStatus,
        gp: r?.gp ?? 0,
        avg: r?.avg ?? 0,
        onWaivers: held.has(p.id),
        score: r?.score ?? -1,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, opts.limit ?? 60)
    .map(({ score: _s, ...p }) => p);
}


