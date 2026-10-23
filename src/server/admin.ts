import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { setFormat } from "@/core/formats";
import { logTransaction, UserError } from "./leagues";
import { lastSync, runSync } from "./sync";
import { settleAll } from "./settle";

const { leagues, teams, profiles } = schema;

/** One round of cheap queries for the admin dashboard (admin-only page, not on any hot path). */
export async function adminOverview() {
  const [leagueRows, teamCounts, users, counts, sync] = await Promise.all([
    db.select().from(leagues).orderBy(desc(leagues.createdAt)),
    db.select({ leagueId: teams.leagueId, n: sql<number>`count(*)::int` }).from(teams).groupBy(teams.leagueId),
    db.select().from(profiles).orderBy(desc(profiles.createdAt)),
    db.execute(sql`select
      (select count(*)::int from players) as players,
      (select count(*)::int from nba_games) as games,
      (select count(*)::int from player_game_stats) as lines`),
    lastSync(),
  ]);
  const byLeague = new Map(teamCounts.map((t) => [t.leagueId, t.n]));
  return {
    leagues: leagueRows.map((l) => ({ ...l, teamCount: byLeague.get(l.id) ?? 0 })),
    users,
    counts: (counts as unknown as { players: number; games: number; lines: number }[])[0],
    sync,
  };
}

export async function setLeagueFormat(adminId: string, leagueId: string, formatId: string, enabled: boolean) {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league) throw new UserError("League not found.");
  let next;
  try {
    next = setFormat(league.settings, formatId, enabled);
  } catch (e) {
    throw new UserError(e instanceof Error ? e.message : "Can't change that format.");
  }
  await db.transaction(async (tx) => {
    await tx.update(leagues).set({ settings: next }).where(eq(leagues.id, leagueId));
    await logTransaction(tx, leagueId, "commissioner", { action: "format", formatId, enabled }, { userId: adminId });
  });
}

export async function setUserAdmin(actingAdminId: string, targetId: string, isAdmin: boolean) {
  if (!isAdmin) {
    if (targetId === actingAdminId) throw new UserError("You can't remove your own admin access.");
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(profiles).where(eq(profiles.isAdmin, true));
    if (n <= 1) throw new UserError("There must be at least one admin.");
  }
  await db.update(profiles).set({ isAdmin }).where(eq(profiles.id, targetId));
}

/** Admin refresh: no cooldown, also refreshes rosters/headshots/injuries. */
export async function adminSync(adminId: string) {
  return runSync({ kind: "manual", triggeredBy: adminId, refreshPlayers: true, afterSync: () => settleAll() });
}
