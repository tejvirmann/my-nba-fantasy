import { describe, expect, it } from "vitest";
import { autoLockToPersist, canLock, resolvePlayerWeek, type LockContext, type WeekGame } from "./lock";

const d = (s: string) => new Date(`2026-11-0${s}:00:00Z`);
const game = (gameId: string, start: string, points: number, final = true, played = true): WeekGame => ({
  gameId,
  startTime: d(start),
  final,
  played,
  points,
});
const WEEK_END = new Date("2026-11-09T05:00:00Z");
const ctx = (over: Partial<LockContext> = {}): LockContext => ({
  mode: "strict",
  auto: { enabled: false, threshold: 40 },
  now: new Date("2026-11-08T12:00:00Z"),
  weekEnd: WEEK_END,
  ...over,
});

const week = [game("g1", "2T19", 55), game("g2", "4T19", 30), game("g3", "6T19", 41)];

/** Games that have not started by `now` (plus 3h to finish) are not final yet. */
const asOf = (games: WeekGame[], now: Date): WeekGame[] =>
  games.map((g) => ({ ...g, final: g.startTime.getTime() + 3 * 3_600_000 <= now.getTime() }));

describe("resolvePlayerWeek", () => {
  it("strict: unlocked defaults to the final game of the week", () => {
    const r = resolvePlayerWeek(week, ctx());
    expect(r.counted).toEqual({ gameId: "g3", points: 41, source: "default" });
  });

  it("strict: a manual lock wins over the default", () => {
    const r = resolvePlayerWeek(week, ctx({ manualLock: { gameId: "g1", source: "manual" } }));
    expect(r.counted).toEqual({ gameId: "g1", points: 55, source: "locked" });
    expect(r.lockableGameIds).toEqual([]);
  });

  it("strict + auto threshold locks the first game at or above the threshold", () => {
    const r = resolvePlayerWeek(week, ctx({ auto: { enabled: true, threshold: 40 } }));
    expect(r.counted).toEqual({ gameId: "g1", points: 55, source: "auto" });
  });

  it("strict + auto falls back to the final game when nothing hits the threshold", () => {
    const r = resolvePlayerWeek(week, ctx({ auto: { enabled: true, threshold: 90 } }));
    expect(r.counted?.gameId).toBe("g3");
    expect(r.counted?.source).toBe("default");
  });

  it("open + auto counts the highest game", () => {
    const r = resolvePlayerWeek(week, ctx({ mode: "open", auto: { enabled: true, threshold: 40 } }));
    expect(r.counted).toEqual({ gameId: "g1", points: 55, source: "auto" });
  });

  it("open without auto defaults to the final game", () => {
    const r = resolvePlayerWeek(week, ctx({ mode: "open" }));
    expect(r.counted?.gameId).toBe("g3");
  });

  it("a DNP is not a game and cannot become the default", () => {
    const games = [game("g1", "2T19", 22), game("g2", "4T19", 0, true, false)];
    expect(resolvePlayerWeek(games, ctx()).counted).toEqual({ gameId: "g1", points: 22, source: "default" });
  });

  it("no games yields no score", () => {
    expect(resolvePlayerWeek([], ctx()).counted).toBeNull();
    expect(resolvePlayerWeek([game("g1", "9T19", 0, false)], ctx()).counted).toBeNull();
  });

  it("is provisional while the week is in progress and final after it ends", () => {
    expect(resolvePlayerWeek(week, ctx()).provisional).toBe(true);
    expect(resolvePlayerWeek(week, ctx({ now: new Date("2026-11-09T06:00:00Z") })).provisional).toBe(false);
  });

  it("strict: only games before the next tip-off are lockable", () => {
    const t1 = new Date("2026-11-03T12:00:00Z");
    const r = resolvePlayerWeek(asOf(week, t1), ctx({ now: t1 }));
    expect(r.lockableGameIds).toEqual(["g1"]);
    const t2 = new Date("2026-11-05T12:00:00Z");
    const later = resolvePlayerWeek(asOf(week, t2), ctx({ now: t2 }));
    expect(later.lockableGameIds).toEqual(["g2"]);
  });

  it("open: every finished game stays lockable until week end", () => {
    const r = resolvePlayerWeek(week, ctx({ mode: "open" }));
    expect(r.lockableGameIds).toEqual(["g1", "g2", "g3"]);
  });
});

describe("canLock", () => {
  it("rejects benched players, unfinished games, double locks", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    const games = asOf(week, now);
    expect(canLock(games, "g1", ctx({ now }), false).ok).toBe(false);
    expect(canLock(games, "g3", ctx({ mode: "open", now }), true).ok).toBe(false);
    expect(canLock(games, "g1", ctx({ now, manualLock: { gameId: "g1", source: "manual" } }), true).ok).toBe(false);
  });

  it("strict: rejects once the next game has started, open allows it", () => {
    const now = new Date("2026-11-05T12:00:00Z");
    expect(canLock(week, "g1", ctx({ now }), true).ok).toBe(false);
    expect(canLock(week, "g1", ctx({ mode: "open", now }), true).ok).toBe(true);
    expect(canLock(week, "g2", ctx({ now }), true).ok).toBe(true);
  });

  it("rejects after the week ends", () => {
    expect(canLock(week, "g3", ctx({ mode: "open", now: new Date("2026-11-10T00:00:00Z") }), true).ok).toBe(false);
  });

  it("strict + auto: blocks a lock after an earlier game already hit the threshold", () => {
    const now = new Date("2026-11-05T12:00:00Z");
    expect(canLock(week, "g2", ctx({ now, auto: { enabled: true, threshold: 40 } }), true).ok).toBe(false);
  });
});

describe("autoLockToPersist", () => {
  it("returns the game to persist in strict+auto, and nothing otherwise", () => {
    expect(autoLockToPersist(week, ctx({ auto: { enabled: true, threshold: 40 } }))).toBe("g1");
    expect(autoLockToPersist(week, ctx())).toBeNull();
    expect(autoLockToPersist(week, ctx({ mode: "open", auto: { enabled: true, threshold: 40 } }))).toBeNull();
  });
});
