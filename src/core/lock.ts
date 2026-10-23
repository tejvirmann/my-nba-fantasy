import type { LockMode } from "./types";

/**
 * Lock-In resolution (Sleeper-style).
 *
 * Each rostered player counts ONE game per matchup week.
 *  - strict: lock a finished game before the player's next game starts, or the chance is gone.
 *            Unlocked default = the final game of the week.
 *  - open:   every finished game stays selectable until the week ends.
 *            Unlocked default = highest game if the manager enabled auto-pick, otherwise the final game.
 *  - auto (manager setting): open mode picks the highest at week end; strict mode auto-locks the
 *            first finished game scoring >= threshold.
 */

export type WeekGame = {
  gameId: string;
  startTime: Date;
  final: boolean;
  /** Only meaningful when final. False = DNP (no stat line). */
  played: boolean;
  points: number;
};

export type LockContext = {
  mode: LockMode;
  auto: { enabled: boolean; threshold: number };
  now: Date;
  weekEnd: Date;
  manualLock?: { gameId: string; source: "manual" | "auto" } | null;
};

export type Counted = { gameId: string; points: number; source: "locked" | "auto" | "default" };

export type Resolution = {
  counted: Counted | null;
  /** True while a later game could still change the result. */
  provisional: boolean;
  lockableGameIds: string[];
};

/** A DNP in a finished game is not a game for that player. */
function effectiveGames(games: WeekGame[]): WeekGame[] {
  return games.filter((g) => !(g.final && !g.played)).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

function nextStart(games: WeekGame[], i: number): Date | null {
  return games[i + 1]?.startTime ?? null;
}

function windowOpen(games: WeekGame[], i: number, ctx: LockContext): boolean {
  if (ctx.now >= ctx.weekEnd) return false;
  if (ctx.mode === "open") return true;
  const next = nextStart(games, i);
  return next === null || ctx.now < next;
}

function highest(finals: WeekGame[]): WeekGame | null {
  let best: WeekGame | null = null;
  for (const g of finals) if (!best || g.points > best.points) best = g; // earliest wins ties
  return best;
}

export function resolvePlayerWeek(allGames: WeekGame[], ctx: LockContext): Resolution {
  const games = effectiveGames(allGames);
  const weekOver = ctx.now >= ctx.weekEnd;
  const finals = games.filter((g) => g.final);
  const hasUpcoming = games.some((g) => !g.final);
  const provisional = !weekOver || hasUpcoming;

  const lockableGameIds = ctx.manualLock
    ? []
    : games.flatMap((g, i) => (g.final && windowOpen(games, i, ctx) ? [g.gameId] : []));

  if (ctx.manualLock) {
    const g = games.find((x) => x.gameId === ctx.manualLock!.gameId);
    return {
      counted: g ? { gameId: g.gameId, points: g.points, source: ctx.manualLock.source === "auto" ? "auto" : "locked" } : null,
      provisional: false,
      lockableGameIds,
    };
  }

  if (ctx.mode === "strict" && ctx.auto.enabled) {
    const hit = finals.find((g) => g.points >= ctx.auto.threshold);
    if (hit) return { counted: { gameId: hit.gameId, points: hit.points, source: "auto" }, provisional: false, lockableGameIds: [] };
  }

  if (finals.length === 0) return { counted: null, provisional, lockableGameIds };

  if (ctx.mode === "open" && ctx.auto.enabled) {
    const best = highest(finals)!;
    return { counted: { gameId: best.gameId, points: best.points, source: "auto" }, provisional, lockableGameIds };
  }

  const last = finals[finals.length - 1];
  return { counted: { gameId: last.gameId, points: last.points, source: "default" }, provisional, lockableGameIds };
}

export type LockCheck = { ok: true } | { ok: false; reason: string };

export function canLock(allGames: WeekGame[], gameId: string, ctx: LockContext, isStarter: boolean): LockCheck {
  if (ctx.manualLock) return { ok: false, reason: "This player is already locked for the week." };
  if (!isStarter) return { ok: false, reason: "Only starters can be locked in." };
  if (ctx.now >= ctx.weekEnd) return { ok: false, reason: "The week is over." };
  const games = effectiveGames(allGames);
  const i = games.findIndex((g) => g.gameId === gameId);
  if (i < 0) return { ok: false, reason: "That game is not in this player's week." };
  if (!games[i].final) return { ok: false, reason: "The game is not final yet." };
  if (ctx.mode === "strict") {
    if (ctx.auto.enabled && games.some((g) => g.final && g.points >= ctx.auto.threshold && g.startTime < games[i].startTime)) {
      return { ok: false, reason: "An earlier game already hit your auto-lock threshold." };
    }
    if (!windowOpen(games, i, ctx)) return { ok: false, reason: "The player's next game has already started." };
  }
  return { ok: true };
}

/** Which game (if any) the sync should persist as an auto-lock right now. */
export function autoLockToPersist(allGames: WeekGame[], ctx: LockContext): string | null {
  if (ctx.mode !== "strict" || !ctx.auto.enabled || ctx.manualLock) return null;
  const r = resolvePlayerWeek(allGames, ctx);
  return r.counted?.source === "auto" ? r.counted.gameId : null;
}
