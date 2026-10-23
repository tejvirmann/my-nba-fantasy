import { and, asc, eq, lte, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { rosterLimit, firstOpenSlot } from "@/core/roster";
import { processWaivers, type Claim } from "@/core/waivers";
import { logTransaction, UserError, type League } from "./leagues";

const { waiverClaims, waiverHolds, rosterEntries, players, teams } = schema;

export async function submitClaim(input: { league: League; teamId: string; addPlayerId: string; dropPlayerId?: string | null }) {
  if (!["active", "playoffs"].includes(input.league.status)) throw new UserError("Waivers open after the draft.");
  const [hold] = await db
    .select()
    .from(waiverHolds)
    .where(and(eq(waiverHolds.leagueId, input.league.id), eq(waiverHolds.playerId, input.addPlayerId)));
  if (!hold || hold.until <= new Date()) throw new UserError("That player is a free agent; just add them.");
  const [dupe] = await db
    .select()
    .from(waiverClaims)
    .where(and(eq(waiverClaims.teamId, input.teamId), eq(waiverClaims.addPlayerId, input.addPlayerId), eq(waiverClaims.status, "pending")));
  if (dupe) throw new UserError("You already have a claim on that player.");
  await db.insert(waiverClaims).values({
    leagueId: input.league.id,
    teamId: input.teamId,
    addPlayerId: input.addPlayerId,
    dropPlayerId: input.dropPlayerId ?? null,
  });
}

export async function cancelClaim(teamId: string, claimId: string) {
  await db
    .update(waiverClaims)
    .set({ status: "cancelled", processedAt: new Date() })
    .where(and(eq(waiverClaims.id, claimId), eq(waiverClaims.teamId, teamId), eq(waiverClaims.status, "pending")));
}

/** Process every claim whose waiver hold has ended. One transaction, so two teams can never win the same player. */
export async function processLeagueWaivers(league: League, now = new Date()): Promise<number> {
  return db.transaction(async (tx) => {
    // Serialize concurrent runs for the same league.
    await tx.select().from(teams).where(eq(teams.leagueId, league.id)).for("update");

    const pending = await tx
      .select()
      .from(waiverClaims)
      .where(and(eq(waiverClaims.leagueId, league.id), eq(waiverClaims.status, "pending")))
      .orderBy(asc(waiverClaims.createdAt));
    if (!pending.length) {
      await tx.delete(waiverHolds).where(and(eq(waiverHolds.leagueId, league.id), lte(waiverHolds.until, now)));
      return 0;
    }
    const holds = await tx.select().from(waiverHolds).where(eq(waiverHolds.leagueId, league.id));
    const stillHeld = new Set(holds.filter((h) => h.until > now).map((h) => h.playerId));
    const ready = pending.filter((c) => !stillHeld.has(c.addPlayerId));

    const teamRows = await tx.select().from(teams).where(eq(teams.leagueId, league.id));
    const roster = await tx
      .select({ entry: rosterEntries, player: players })
      .from(rosterEntries)
      .innerJoin(players, eq(players.id, rosterEntries.playerId))
      .where(eq(rosterEntries.leagueId, league.id));
    const owned = new Map(roster.map((r) => [r.entry.playerId, r.entry.teamId]));
    const counts = new Map<string, number>();
    for (const r of roster) counts.set(r.entry.teamId, (counts.get(r.entry.teamId) ?? 0) + 1);

    const claims: Claim[] = ready.map((c) => ({
      id: c.id,
      teamId: c.teamId,
      addPlayerId: c.addPlayerId,
      dropPlayerId: c.dropPlayerId,
      createdAt: c.createdAt.getTime(),
    }));
    const { results, priority } = processWaivers({
      claims,
      priority: [...teamRows].sort((a, b) => a.waiverPriority - b.waiverPriority).map((t) => t.id),
      owned,
      rosterCounts: counts,
      rosterLimit: rosterLimit(league.settings),
    });

    let won = 0;
    // Apply wins in claim order so a drop frees its slot before the add.
    for (const res of results) {
      const claim = ready.find((c) => c.id === res.id)!;
      await tx
        .update(waiverClaims)
        .set({ status: res.status, reason: res.reason ?? null, processedAt: now })
        .where(eq(waiverClaims.id, claim.id));
      if (res.status !== "won") continue;
      won++;
      if (claim.dropPlayerId) {
        await tx.delete(rosterEntries).where(and(eq(rosterEntries.leagueId, league.id), eq(rosterEntries.playerId, claim.dropPlayerId)));
        await tx
          .insert(waiverHolds)
          .values({ leagueId: league.id, playerId: claim.dropPlayerId, until: new Date(now.getTime() + league.settings.waiverHoldHours * 3_600_000) })
          .onConflictDoNothing();
      }
      const [p] = await tx.select().from(players).where(eq(players.id, claim.addPlayerId));
      const mine = await tx
        .select({ entry: rosterEntries, player: players })
        .from(rosterEntries)
        .innerJoin(players, eq(players.id, rosterEntries.playerId))
        .where(eq(rosterEntries.teamId, claim.teamId));
      const slot = firstOpenSlot(
        mine.map((r) => ({ playerId: r.player.id, slot: r.entry.slot, position: r.player.position })),
        p.position,
        league.settings,
      );
      await tx.insert(rosterEntries).values({ leagueId: league.id, teamId: claim.teamId, playerId: claim.addPlayerId, slot });
      await tx.delete(waiverHolds).where(and(eq(waiverHolds.leagueId, league.id), eq(waiverHolds.playerId, claim.addPlayerId)));
      await logTransaction(tx, league.id, "waiver", { playerId: claim.addPlayerId, name: p.name, dropped: claim.dropPlayerId }, { teamId: claim.teamId });
    }
    for (let i = 0; i < priority.length; i++) {
      await tx.update(teams).set({ waiverPriority: i + 1 }).where(eq(teams.id, priority[i]));
    }
    await tx.delete(waiverHolds).where(and(eq(waiverHolds.leagueId, league.id), lte(waiverHolds.until, now)));
    return won;
  });
}

export async function pendingClaims(leagueId: string, teamId?: string) {
  const conds = [eq(waiverClaims.leagueId, leagueId), inArray(waiverClaims.status, ["pending"])];
  if (teamId) conds.push(eq(waiverClaims.teamId, teamId));
  return db
    .select({ claim: waiverClaims, player: players })
    .from(waiverClaims)
    .innerJoin(players, eq(players.id, waiverClaims.addPlayerId))
    .where(and(...conds))
    .orderBy(asc(waiverClaims.createdAt));
}
