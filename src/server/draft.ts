import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { pickInfo, shuffled, totalPicks } from "@/core/draft";
import { firstOpenSlot, rosterLimit } from "@/core/roster";
import { generateSchedule } from "./engine";
import { logTransaction, UserError, type League } from "./leagues";
import { playerRankings } from "./rankings";

const { drafts, draftPicks, players, rosterEntries, teams, leagues } = schema;

export type Draft = typeof drafts.$inferSelect;

export async function getDraft(leagueId: string): Promise<Draft | null> {
  const [d] = await db.select().from(drafts).where(eq(drafts.leagueId, leagueId));
  return d ?? null;
}

export async function createDraft(league: League): Promise<Draft> {
  if (league.status !== "setup") throw new UserError("This league has already drafted.");
  const teamRows = await db.select().from(teams).where(eq(teams.leagueId, league.id));
  if (teamRows.length < 2) throw new UserError("You need at least 2 teams to draft.");
  if (teamRows.some((t) => t.ownerId === null)) throw new UserError("Every team needs a manager before the draft.");
  const rounds = rosterLimit(league.settings);
  const existing = await getDraft(league.id);
  if (existing && existing.status !== "pending") throw new UserError("The draft has already started.");
  const order = shuffled(teamRows.map((t) => t.id), Date.now() % 1_000_000);
  if (existing) {
    const [d] = await db.update(drafts).set({ order, rounds, pickSeconds: league.settings.pickSeconds }).where(eq(drafts.id, existing.id)).returning();
    return d;
  }
  const [d] = await db.insert(drafts).values({ leagueId: league.id, order, rounds, pickSeconds: league.settings.pickSeconds }).returning();
  return d;
}

export async function startDraft(league: League) {
  const d = await getDraft(league.id);
  if (!d || d.status !== "pending") throw new UserError("Create the draft first.");
  await db.transaction(async (tx) => {
    await tx.update(drafts).set({ status: "live", deadline: new Date(Date.now() + d.pickSeconds * 1000) }).where(eq(drafts.id, d.id));
    await tx.update(leagues).set({ status: "drafting" }).where(eq(leagues.id, league.id));
  });
}

export async function setDraftPaused(league: League, paused: boolean) {
  const d = await getDraft(league.id);
  if (!d || !["live", "paused"].includes(d.status)) throw new UserError("The draft isn't running.");
  await db
    .update(drafts)
    .set(paused ? { status: "paused", deadline: null } : { status: "live", deadline: new Date(Date.now() + d.pickSeconds * 1000) })
    .where(eq(drafts.id, d.id));
}

/** Core of a pick. Locks the draft row so two simultaneous picks cannot both succeed. */
async function pick(league: League, by: { userId: string | null; force?: boolean }, playerId: string | null, expectedOverall?: number) {
  return db.transaction(async (tx) => {
    const [d] = await tx.select().from(drafts).where(eq(drafts.leagueId, league.id)).for("update");
    if (!d || d.status !== "live") throw new UserError("The draft isn't live.");
    if (expectedOverall !== undefined && d.currentPick !== expectedOverall) throw new UserError("That pick has already been made.");
    const info = pickInfo(d.order, d.currentPick);
    const [team] = await tx.select().from(teams).where(eq(teams.id, info.teamId));
    if (!by.force && team.ownerId !== by.userId) throw new UserError("It's not your pick.");

    let chosen = playerId;
    const isAuto = chosen === null;
    if (!chosen) {
      const taken = await tx.select({ id: draftPicks.playerId }).from(draftPicks).where(eq(draftPicks.draftId, d.id));
      const takenIds = new Set(taken.map((t) => t.id));
      const [all, ranks] = await Promise.all([
        tx.select().from(players).where(eq(players.isActive, true)),
        playerRankings(league.settings.scoring),
      ]);
      const best = all
        .filter((p) => !takenIds.has(p.id))
        .sort((a, b) => (ranks.get(b.espnId)?.score ?? -1) - (ranks.get(a.espnId)?.score ?? -1) || a.name.localeCompare(b.name))[0];
      if (!best) throw new UserError("No players left to draft.");
      chosen = best.id;
    } else {
      const [p] = await tx.select().from(players).where(eq(players.id, chosen));
      if (!p || !p.isActive) throw new UserError("That player can't be drafted.");
      const [dup] = await tx.select().from(draftPicks).where(and(eq(draftPicks.draftId, d.id), eq(draftPicks.playerId, chosen)));
      if (dup) throw new UserError("That player was just taken.");
    }

    const [player] = await tx.select().from(players).where(eq(players.id, chosen));
    await tx.insert(draftPicks).values({ draftId: d.id, overall: d.currentPick, round: info.round, teamId: team.id, playerId: chosen, isAuto });
    const current = await tx
      .select({ entry: rosterEntries, player: players })
      .from(rosterEntries)
      .innerJoin(players, eq(players.id, rosterEntries.playerId))
      .where(eq(rosterEntries.teamId, team.id));
    const slot = firstOpenSlot(
      current.map((r) => ({ playerId: r.player.id, slot: r.entry.slot, position: r.player.position })),
      player.position,
      league.settings,
    );
    await tx.insert(rosterEntries).values({ leagueId: league.id, teamId: team.id, playerId: chosen, slot });
    await logTransaction(tx, league.id, "draft", { overall: d.currentPick, round: info.round, playerId: chosen, name: player.name, auto: isAuto }, { teamId: team.id, userId: by.userId });

    const next = d.currentPick + 1;
    if (next > totalPicks(d.order.length, d.rounds)) {
      await tx.update(drafts).set({ status: "done", currentPick: next, deadline: null }).where(eq(drafts.id, d.id));
      await tx.update(leagues).set({ status: "active" }).where(eq(leagues.id, league.id));
      return { finished: true };
    }
    await tx.update(drafts).set({ currentPick: next, deadline: new Date(Date.now() + d.pickSeconds * 1000) }).where(eq(drafts.id, d.id));
    return { finished: false };
  });
}

export async function makePick(league: League, userId: string, playerId: string, expectedOverall: number) {
  const r = await pick(league, { userId }, playerId, expectedOverall);
  if (r.finished) await generateSchedule(league.id);
}

/**
 * Serverless has no timers, so overdue picks are made lazily: whoever loads the draft room
 * (or the daily cron) triggers auto-picks for every expired deadline.
 */
export async function autoPickExpired(league: League, now = new Date()): Promise<number> {
  let made = 0;
  for (let i = 0; i < 200; i++) {
    const d = await getDraft(league.id);
    if (!d || d.status !== "live" || !d.deadline || d.deadline > now) break;
    try {
      const r = await pick(league, { userId: null, force: true }, null, d.currentPick);
      made++;
      if (r.finished) {
        await generateSchedule(league.id);
        break;
      }
    } catch (e) {
      if (e instanceof UserError) break; // someone else got there first
      throw e;
    }
  }
  return made;
}

/** Commissioner nudge: pick for the team on the clock right now. */
export async function commissionerAutoPick(league: League) {
  const d = await getDraft(league.id);
  if (!d) throw new UserError("No draft.");
  const r = await pick(league, { userId: null, force: true }, null, d.currentPick);
  if (r.finished) await generateSchedule(league.id);
}

export async function draftBoard(draftId: string) {
  return db
    .select({ pick: draftPicks, player: players })
    .from(draftPicks)
    .innerJoin(players, eq(players.id, draftPicks.playerId))
    .where(eq(draftPicks.draftId, draftId))
    .orderBy(asc(draftPicks.overall));
}


