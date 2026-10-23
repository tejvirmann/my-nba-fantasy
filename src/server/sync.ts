import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { provider } from "@/providers/espn";
import { chunk, mapLimit, ymd } from "./util";

const { nbaGames, playerGameStats, players, syncRuns, profiles } = schema;

export const MANUAL_COOLDOWN_MS = 5 * 60_000;
const RECHECK_FINALS_MS = 36 * 3_600_000;

export type SyncOptions = {
  kind: "cron" | "manual";
  triggeredBy?: string | null;
  daysBack?: number;
  daysForward?: number;
  /** Also refresh rosters, headshots and injuries (30 extra requests). */
  refreshPlayers?: boolean;
  /** Called after stats land, e.g. to settle leagues. */
  afterSync?: () => Promise<void>;
};

export type SyncResult = { runId: string; games: number; lines: number; players: number };

export async function lastSync() {
  const [row] = await db
    .select({
      id: syncRuns.id,
      kind: syncRuns.kind,
      startedAt: syncRuns.startedAt,
      finishedAt: syncRuns.finishedAt,
      ok: syncRuns.ok,
      error: syncRuns.error,
      triggeredBy: syncRuns.triggeredBy,
      by: profiles.displayName,
    })
    .from(syncRuns)
    .leftJoin(profiles, eq(profiles.id, syncRuns.triggeredBy))
    .orderBy(desc(syncRuns.startedAt))
    .limit(1);
  return row ?? null;
}

/** Returns a message when a manual refresh is not allowed right now. */
export async function manualRefreshBlocked(now = new Date()): Promise<string | null> {
  const last = await lastSync();
  if (!last) return null;
  const age = now.getTime() - last.startedAt.getTime();
  const running = last.finishedAt === null && age < 3 * 60_000;
  if (running) return "A refresh is already running.";
  if (age < MANUAL_COOLDOWN_MS) {
    const mins = Math.ceil((MANUAL_COOLDOWN_MS - age) / 60_000);
    return `Stats were just refreshed${last.by ? ` by ${last.by}` : ""}. Try again in ${mins} min.`;
  }
  return null;
}

export async function runSync(opts: SyncOptions): Promise<SyncResult> {
  const [run] = await db
    .insert(syncRuns)
    .values({ kind: opts.kind, triggeredBy: opts.triggeredBy ?? null })
    .returning({ id: syncRuns.id });

  let games = 0;
  let lines = 0;
  let playerCount = 0;
  try {
    const now = new Date();
    const dates = Array.from({ length: (opts.daysBack ?? 3) + (opts.daysForward ?? 7) + 1 }, (_, i) =>
      ymd(now, i - (opts.daysBack ?? 3)),
    );
    ({ games, lines } = await ingestDates(dates, now));

    if (opts.refreshPlayers) playerCount = await syncPlayers();
    if (opts.afterSync) await opts.afterSync();

    await db.update(syncRuns).set({ finishedAt: new Date(), ok: true, games, lines }).where(eq(syncRuns.id, run.id));
    return { runId: run.id, games, lines, players: playerCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), ok: false, games, lines, error: message.slice(0, 500) })
      .where(eq(syncRuns.id, run.id));
    throw err;
  }
}

/** Upsert games for the given YYYYMMDD dates and pull box scores that are missing or recently final. */
export async function ingestDates(dates: string[], now = new Date()): Promise<{ games: number; lines: number }> {
  const perDay = await mapLimit(dates, 4, (d) => provider.getGames(d));
  const fetched = [...new Map(perDay.flat().map((g) => [g.espnId, g])).values()];
  const games = fetched.length;

  for (const part of chunk(fetched, 100)) {
    await db
      .insert(nbaGames)
      .values(part.map((g) => ({ ...g, updatedAt: new Date() })))
      .onConflictDoUpdate({
        target: nbaGames.espnId,
        set: {
          startTime: sql`excluded.start_time`,
          status: sql`excluded.status`,
          homeScore: sql`excluded.home_score`,
          awayScore: sql`excluded.away_score`,
          updatedAt: sql`now()`,
        },
      });
  }

  // Box scores: every final we have no lines for, plus recent finals (stat corrections).
  const finals = fetched.filter((g) => g.status === "final");
  const haveRows = new Set(
    (finals.length
      ? await db
          .selectDistinct({ g: playerGameStats.gameEspnId })
          .from(playerGameStats)
          .where(inArray(playerGameStats.gameEspnId, finals.map((g) => g.espnId)))
      : []
    ).map((r) => r.g),
  );
  const need = finals.filter((g) => !haveRows.has(g.espnId) || now.getTime() - g.startTime.getTime() < RECHECK_FINALS_MS);
  const boxes = await mapLimit(need, 5, (g) => provider.getBoxScore(g.espnId));
  const allLines = boxes.flat();
  const lines = allLines.length;

  // Make sure every player in a box score exists (insert only; roster sync owns team/injury data).
  const seen = new Map(allLines.map((l) => [l.playerEspnId, l]));
  for (const part of chunk([...seen.values()], 200)) {
    await db
      .insert(players)
      .values(
        part.map((l) => ({
          espnId: l.playerEspnId,
          name: l.name,
          teamAbbr: l.teamAbbr,
          position: l.position,
          imageUrl: l.imageUrl,
        })),
      )
      .onConflictDoNothing({ target: players.espnId });
  }

  for (const part of chunk(allLines, 300)) {
    await db
      .insert(playerGameStats)
      .values(part.map(({ name: _n, imageUrl: _i, position: _p, ...row }) => ({ ...row, updatedAt: new Date() })))
      .onConflictDoUpdate({
        target: [playerGameStats.gameEspnId, playerGameStats.playerEspnId],
        set: {
          teamAbbr: sql`excluded.team_abbr`,
          minutes: sql`excluded.minutes`,
          pts: sql`excluded.pts`,
          reb: sql`excluded.reb`,
          ast: sql`excluded.ast`,
          stl: sql`excluded.stl`,
          blk: sql`excluded.blk`,
          tov: sql`excluded.tov`,
          tpm: sql`excluded.tpm`,
          tpa: sql`excluded.tpa`,
          fgm: sql`excluded.fgm`,
          fga: sql`excluded.fga`,
          ftm: sql`excluded.ftm`,
          fta: sql`excluded.fta`,
          oreb: sql`excluded.oreb`,
          dreb: sql`excluded.dreb`,
          pf: sql`excluded.pf`,
          plusMinus: sql`excluded.plus_minus`,
          updatedAt: sql`now()`,
        },
      });
  }
  return { games, lines };
}

/** Refresh every team's roster: names, positions, headshots, injury status. */
export async function syncPlayers(): Promise<number> {
  const teams = await provider.getTeamIds();
  const rosters = await mapLimit(teams, 6, async (t) => {
    const r = await provider.getRoster(t.id);
    return r.map((p) => ({ ...p, teamAbbr: p.teamAbbr || t.abbr }));
  });
  const all = rosters.flat();
  const activeIds = all.map((p) => p.espnId);
  for (const part of chunk(all, 200)) {
    await db
      .insert(players)
      .values(part.map((p) => ({ ...p, isActive: true, updatedAt: new Date() })))
      .onConflictDoUpdate({
        target: players.espnId,
        set: {
          name: sql`excluded.name`,
          teamAbbr: sql`excluded.team_abbr`,
          position: sql`excluded.position`,
          jersey: sql`excluded.jersey`,
          imageUrl: sql`excluded.image_url`,
          injuryStatus: sql`excluded.injury_status`,
          isActive: sql`true`,
          updatedAt: sql`now()`,
        },
      });
  }
  // Anyone not on a current roster is inactive for the draft/free-agent pool.
  await db.update(players).set({ isActive: false }).where(and(eq(players.isActive, true), notInArray(players.espnId, activeIds)));
  return all.length;
}
