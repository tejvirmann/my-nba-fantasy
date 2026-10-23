import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { autoLockToPersist, canLock, resolvePlayerWeek, type LockContext, type Resolution, type WeekGame } from "@/core/lock";
import { fantasyPoints } from "@/core/scoring";
import { buildSchedule } from "@/core/schedule";
import { computeStandings, playoffRound } from "@/core/standings";
import { shuffled } from "@/core/draft";
import { isFormatEnabled } from "@/core/formats";
import { SLOT_BENCH } from "@/core/types";
import { weekBounds, weekOf } from "@/core/weeks";
import { logTransaction, UserError, type League, type Team } from "./leagues";
import { playerRankings } from "./rankings";

const { nbaGames, playerGameStats, players, rosterEntries, teams, weeklyLocks, matchups, leagues } = schema;

export type GameView = {
  gameId: string;
  start: Date;
  label: string; // "vs BOS" / "@ LAL"
  /** ESPN-style one-liner: "vs CLE, W 118-104", "@NY, Sat 7:30 PM". */
  detail: string;
  status: "scheduled" | "live" | "final";
  played: boolean;
  points: number;
  line: { pts: number; reb: number; ast: number; stl: number; blk: number; tov: number; tpm: number; minutes: number } | null;
};

export type PlayerWeekView = {
  playerId: string;
  espnId: string;
  name: string;
  imageUrl: string | null;
  teamAbbr: string | null;
  position: string | null;
  injuryStatus: string | null;
  /** Average fantasy points per game over all stored box scores. */
  avg: number;
  slot: string;
  onRoster: boolean;
  isStarter: boolean;
  games: GameView[];
  resolution: Resolution;
  lock: { gameId: string; source: "manual" | "auto" } | null;
  /** Points this player adds to the team total (0 for bench or no game). */
  counted: number;
  weekGames: WeekGame[];
  lockCtx: LockContext;
};

export type TeamWeekView = { team: Team; players: PlayerWeekView[]; total: number };

export type WeekView = {
  league: League;
  week: number;
  start: Date;
  end: Date;
  now: Date;
  teams: TeamWeekView[];
  /** True when every game in the week is final (or long stuck) and the week has ended. */
  settled: boolean;
};

export function currentWeek(league: League, now = new Date()): number {
  return weekOf(league.week1Start, league.timezone, now);
}

/** Pass `known` when the caller already loaded the league row, to save a round-trip. */
export async function computeWeek(leagueId: string, week: number, now = new Date(), known?: League): Promise<WeekView> {
  const league = known ?? (await db.select().from(leagues).where(eq(leagues.id, leagueId)))[0];
  if (!league) throw new UserError("League not found.");
  const settings = league.settings;
  const autoLockAllowed = isFormatEnabled(settings, "auto_lock");
  const { start, end } = weekBounds(league.week1Start, league.timezone, week);

  const [teamRows, rosterRows, lockRows, games] = await Promise.all([
    db.select().from(teams).where(eq(teams.leagueId, leagueId)).orderBy(asc(teams.createdAt)),
    db
      .select({ entry: rosterEntries, player: players })
      .from(rosterEntries)
      .innerJoin(players, eq(players.id, rosterEntries.playerId))
      .where(eq(rosterEntries.leagueId, leagueId)),
    db.select().from(weeklyLocks).where(and(eq(weeklyLocks.leagueId, leagueId), eq(weeklyLocks.week, week))),
    db.select().from(nbaGames).where(and(gte(nbaGames.startTime, start), lt(nbaGames.startTime, end))),
  ]);

  const gameIds = games.map((g) => g.espnId);
  const rosterPlayerIds = new Set(rosterRows.map((r) => r.player.id));
  const departedIds = lockRows.filter((l) => !rosterPlayerIds.has(l.playerId)).map((l) => l.playerId);
  // Independent of each other, so fetch together.
  const [lines, departed, ranks] = await Promise.all([
    gameIds.length ? db.select().from(playerGameStats).where(inArray(playerGameStats.gameEspnId, gameIds)) : Promise.resolve([]),
    departedIds.length ? db.select().from(players).where(inArray(players.id, departedIds)) : Promise.resolve([]),
    playerRankings(settings.scoring),
  ]);
  const linesByPlayer = new Map<string, Map<string, (typeof lines)[number]>>();
  for (const l of lines) {
    if (!linesByPlayer.has(l.playerEspnId)) linesByPlayer.set(l.playerEspnId, new Map());
    linesByPlayer.get(l.playerEspnId)!.set(l.gameEspnId, l);
  }


  const buildPlayer = (
    p: typeof players.$inferSelect,
    team: Team,
    slot: string,
    onRoster: boolean,
    acquiredAt: Date | null,
  ): PlayerWeekView => {
    const mine = linesByPlayer.get(p.espnId);
    const gameViews: GameView[] = [];
    for (const g of games) {
      const line = mine?.get(g.espnId) ?? null;
      const onTeamSchedule = p.teamAbbr !== null && (g.homeAbbr === p.teamAbbr || g.awayAbbr === p.teamAbbr);
      if (!line && !onTeamSchedule) continue;
      if (acquiredAt && g.startTime < acquiredAt) continue; // only games after the player joined this team count
      const abbr = line?.teamAbbr ?? p.teamAbbr;
      const home = g.homeAbbr === abbr;
      const label = home ? `vs ${g.awayAbbr}` : `@ ${g.homeAbbr}`;
      const [pf, pa] = home ? [g.homeScore, g.awayScore] : [g.awayScore, g.homeScore];
      const detail =
        g.status === "final" && pf !== null && pa !== null
          ? `${label}, ${pf > pa ? "W" : "L"} ${pf}-${pa}`
          : g.status === "live"
            ? `${label}, Live${pf !== null ? ` ${pf}-${pa}` : ""}`
            : `${label}, ${new Intl.DateTimeFormat("en-US", { timeZone: league.timezone, weekday: "short", hour: "numeric", minute: "2-digit" }).format(g.startTime)}`;
      gameViews.push({
        gameId: g.espnId,
        start: g.startTime,
        label,
        detail,
        status: g.status as GameView["status"],
        played: !!line,
        points: line ? fantasyPoints(line, settings.scoring) : 0,
        line: line
          ? { pts: line.pts, reb: line.reb, ast: line.ast, stl: line.stl, blk: line.blk, tov: line.tov, tpm: line.tpm, minutes: line.minutes }
          : null,
      });
    }
    gameViews.sort((a, b) => a.start.getTime() - b.start.getTime());
    const weekGames: WeekGame[] = gameViews.map((g) => ({
      gameId: g.gameId,
      startTime: g.start,
      final: g.status === "final",
      played: g.played,
      points: g.points,
    }));
    const lockRow = lockRows.find((l) => l.teamId === team.id && l.playerId === p.id) ?? null;
    const lockCtx: LockContext = {
      mode: settings.lockMode,
      auto: { enabled: team.autoLock && autoLockAllowed, threshold: team.autoLockThreshold },
      now,
      weekEnd: end,
      manualLock: lockRow ? { gameId: lockRow.gameEspnId, source: lockRow.source as "manual" | "auto" } : null,
    };
    // A departed player (dropped/traded) only keeps a game that was already locked.
    const resolution = onRoster || lockRow ? resolvePlayerWeek(weekGames, lockCtx) : { counted: null, provisional: false, lockableGameIds: [] };
    const effectiveSlot = lockRow ? lockRow.slot : slot;
    const isStarter = effectiveSlot !== SLOT_BENCH;
    return {
      playerId: p.id,
      espnId: p.espnId,
      name: p.name,
      imageUrl: p.imageUrl,
      teamAbbr: p.teamAbbr,
      position: p.position,
      injuryStatus: p.injuryStatus,
      avg: ranks.get(p.espnId)?.avg ?? 0,
      slot: effectiveSlot,
      onRoster,
      isStarter,
      games: gameViews,
      resolution,
      lock: lockRow ? { gameId: lockRow.gameEspnId, source: lockRow.source as "manual" | "auto" } : null,
      counted: isStarter ? (resolution.counted?.points ?? 0) : 0,
      weekGames,
      lockCtx,
    };
  };

  const teamViews: TeamWeekView[] = teamRows.map((team) => {
    const roster = rosterRows
      .filter((r) => r.entry.teamId === team.id)
      .map((r) => buildPlayer(r.player, team, r.entry.slot, true, r.entry.acquiredAt));
    const gone = lockRows
      .filter((l) => l.teamId === team.id && !roster.some((r) => r.playerId === l.playerId))
      .map((l) => departed.find((p) => p.id === l.playerId))
      .filter((p): p is typeof players.$inferSelect => !!p)
      .map((p) => buildPlayer(p, team, SLOT_BENCH, false, null));
    const all = [...roster, ...gone];
    const total = Math.round(all.reduce((s, p) => s + p.counted, 0) * 100) / 100;
    return { team, players: all, total };
  });

  const settled =
    now >= end && games.every((g) => g.status === "final" || now.getTime() - g.startTime.getTime() > 24 * 3_600_000);
  return { league, week, start, end, now, teams: teamViews, settled };
}

// ---- Lock-In actions ----

export async function lockGame(input: { leagueId: string; teamId: string; playerId: string; gameEspnId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const [league] = await db.select().from(leagues).where(eq(leagues.id, input.leagueId));
  if (!league || !["active", "playoffs"].includes(league.status)) throw new UserError("The season hasn't started yet.");
  const week = currentWeek(league, now);
  if (week < 1) throw new UserError("The season hasn't started yet.");
  const view = await computeWeek(input.leagueId, week, now);
  const tv = view.teams.find((t) => t.team.id === input.teamId);
  const pv = tv?.players.find((p) => p.playerId === input.playerId && p.onRoster);
  if (!tv || !pv) throw new UserError("That player is not on your roster.");
  const check = canLock(pv.weekGames, input.gameEspnId, pv.lockCtx, pv.isStarter);
  if (!check.ok) throw new UserError(check.reason);
  try {
    await db.transaction(async (tx) => {
      await tx.insert(weeklyLocks).values({
        leagueId: input.leagueId,
        teamId: input.teamId,
        playerId: input.playerId,
        week,
        gameEspnId: input.gameEspnId,
        source: "manual",
        slot: pv.slot,
      });
      await logTransaction(tx, input.leagueId, "lock", { playerId: input.playerId, gameEspnId: input.gameEspnId, week }, { teamId: input.teamId });
    });
  } catch (e) {
    if (String((e as { cause?: Error }).cause?.message ?? e).includes("weekly_locks_uq")) throw new UserError("Already locked for the week.");
    throw e;
  }
}

export async function resetLock(input: { leagueId: string; teamId: string; playerId: string; week: number; userId: string }) {
  await db.transaction(async (tx) => {
    await tx
      .delete(weeklyLocks)
      .where(
        and(eq(weeklyLocks.leagueId, input.leagueId), eq(weeklyLocks.teamId, input.teamId), eq(weeklyLocks.playerId, input.playerId), eq(weeklyLocks.week, input.week)),
      );
    await logTransaction(tx, input.leagueId, "commissioner", { action: "reset_lock", playerId: input.playerId, week: input.week }, { teamId: input.teamId, userId: input.userId });
  });
}

/** Persist strict-mode auto-locks so they show up as locks even if a manager toggles the setting later. */
export async function applyAutoLocks(leagueId: string, now = new Date()): Promise<number> {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league || league.settings.lockMode !== "strict" || !["active", "playoffs"].includes(league.status)) return 0;
  const w = currentWeek(league, now);
  let n = 0;
  for (const week of [w - 1, w]) {
    if (week < 1) continue;
    const view = await computeWeek(leagueId, week, now);
    for (const tv of view.teams) {
      for (const pv of tv.players) {
        if (!pv.onRoster || !pv.isStarter || pv.lock) continue;
        const gameId = autoLockToPersist(pv.weekGames, pv.lockCtx);
        if (!gameId) continue;
        const res = await db
          .insert(weeklyLocks)
          .values({ leagueId, teamId: tv.team.id, playerId: pv.playerId, week, gameEspnId: gameId, source: "auto", slot: pv.slot })
          .onConflictDoNothing();
        n += res.length ? 1 : 0;
      }
    }
  }
  return n;
}

// ---- Schedule, finalization, playoffs ----

export async function generateSchedule(leagueId: string, now = new Date()): Promise<void> {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  const teamRows = await db.select().from(teams).where(eq(teams.leagueId, leagueId));
  const w = currentWeek(league, now);
  const startWeek = w < 1 ? 1 : w + 1;
  const total = league.regularWeeks;
  if (startWeek > total) return;
  const order = shuffled(teamRows.map((t) => t.id), Date.now() % 100000);
  const sched = buildSchedule(order, total);
  const rows = [];
  for (let week = startWeek; week <= total; week++) {
    for (const p of sched[week - 1]) rows.push({ leagueId, week, teamAId: p.teamA, teamBId: p.teamB });
  }
  await db.delete(matchups).where(eq(matchups.leagueId, leagueId));
  if (rows.length) await db.insert(matchups).values(rows);
}

export async function standingsFor(leagueId: string) {
  const teamRows = await db.select().from(teams).where(eq(teams.leagueId, leagueId));
  const done = await db
    .select()
    .from(matchups)
    .where(and(eq(matchups.leagueId, leagueId), eq(matchups.isPlayoff, false), sql`${matchups.finalizedAt} is not null`));
  const standings = computeStandings(
    teamRows.map((t) => t.id),
    done.map((m) => ({ teamA: m.teamAId, teamB: m.teamBId, scoreA: m.scoreA ?? 0, scoreB: m.scoreB ?? 0 })),
  );
  return { teams: teamRows, standings };
}

/** Finalize every ended week whose games are all in, then move the season forward. */
export async function finalizeWeeks(leagueId: string, now = new Date()): Promise<number> {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  if (!league || !["active", "playoffs"].includes(league.status)) return 0;
  let finalized = 0;
  for (let guard = 0; guard < 30; guard++) {
    const open = await db
      .select()
      .from(matchups)
      .where(and(eq(matchups.leagueId, leagueId), isNull(matchups.finalizedAt)))
      .orderBy(asc(matchups.week));
    if (!open.length) break;
    const week = open[0].week;
    const { end } = weekBounds(league.week1Start, league.timezone, week);
    if (now < end) break;
    const view = await computeWeek(leagueId, week, now);
    if (!view.settled) break;
    const total = new Map(view.teams.map((t) => [t.team.id, t.total]));
    await db.transaction(async (tx) => {
      for (const m of open.filter((o) => o.week === week)) {
        const a = total.get(m.teamAId) ?? 0;
        const b = m.teamBId ? (total.get(m.teamBId) ?? 0) : 0;
        let winner: string | null = null;
        if (m.teamBId) winner = a > b ? m.teamAId : b > a ? m.teamBId : m.isPlayoff ? m.teamAId : null;
        else if (m.isPlayoff) winner = m.teamAId;
        await tx.update(matchups).set({ scoreA: a, scoreB: b, winnerId: winner, finalizedAt: now }).where(eq(matchups.id, m.id));
        finalized++;
      }
    });
    await advanceSeason(leagueId);
  }
  return finalized;
}

async function advanceSeason(leagueId: string): Promise<void> {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  const all = await db.select().from(matchups).where(eq(matchups.leagueId, leagueId));
  if (all.some((m) => m.finalizedAt === null)) return;
  const { teams: teamRows, standings } = await standingsFor(leagueId);
  const seedOrder = standings.map((s) => s.teamId);

  if (league.status === "active") {
    const lastWeek = Math.max(0, ...all.map((m) => m.week));
    const eligible = Math.min(league.playoffTeams, teamRows.length);
    if (eligible < 2) {
      await db.update(leagues).set({ status: "complete" }).where(eq(leagues.id, leagueId));
      return;
    }
    await createPlayoffRound(leagueId, seedOrder.slice(0, eligible), lastWeek + 1, 1);
    await db.update(leagues).set({ status: "playoffs" }).where(eq(leagues.id, leagueId));
    return;
  }

  if (league.status === "playoffs") {
    const lastRound = Math.max(...all.filter((m) => m.isPlayoff).map((m) => m.round ?? 1));
    const roundRows = all.filter((m) => m.isPlayoff && m.round === lastRound);
    const winners = roundRows.map((m) => m.winnerId!).filter(Boolean);
    if (winners.length <= 1) {
      await db.update(leagues).set({ status: "complete" }).where(eq(leagues.id, leagueId));
      await logTransaction(db, leagueId, "commissioner", { action: "champion", teamId: winners[0] ?? null });
      return;
    }
    const survivors = seedOrder.filter((id) => winners.includes(id));
    const week = Math.max(...roundRows.map((m) => m.week)) + 1;
    await createPlayoffRound(leagueId, survivors, week, lastRound + 1);
  }
}

async function createPlayoffRound(leagueId: string, seeded: string[], week: number, round: number) {
  const { pairs, byes } = playoffRound(seeded);
  const rows = [
    ...pairs.map((p) => ({ leagueId, week, teamAId: p.high, teamBId: p.low, isPlayoff: true, round })),
    ...byes.map((id) => ({ leagueId, week, teamAId: id, teamBId: null, isPlayoff: true, round })),
  ];
  await db.insert(matchups).values(rows);
}


