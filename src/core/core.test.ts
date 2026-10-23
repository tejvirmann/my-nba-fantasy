import { describe, expect, it } from "vitest";
import { fantasyPoints } from "./scoring";
import { nextMonday, weekBounds, weekOf } from "./weeks";
import { canFillSlot, firstOpenSlot, validateLineup } from "./roster";
import { pickInfo, shuffled } from "./draft";
import { buildSchedule } from "./schedule";
import { computeStandings, playoffRound } from "./standings";
import { processWaivers, validateTrade } from "./waivers";
import { DEFAULT_SCORING, DEFAULT_SETTINGS } from "./types";

describe("scoring", () => {
  const line = { pts: 30, reb: 10, ast: 5, stl: 2, blk: 1, tov: 4, tpm: 3 };
  it("applies weights", () => {
    // 30 + 12 + 7.5 + 6 + 3 - 4 + 1.5
    expect(fantasyPoints(line, DEFAULT_SCORING)).toBe(56);
  });
  it("is stable on repeat (idempotent inputs give identical output)", () => {
    expect(fantasyPoints(line, DEFAULT_SCORING)).toBe(fantasyPoints({ ...line }, DEFAULT_SCORING));
  });
  it("adds double-double and triple-double bonuses", () => {
    const w = { ...DEFAULT_SCORING, doubleDouble: 5, tripleDouble: 10 };
    expect(fantasyPoints({ ...line, ast: 4 }, w)).toBe(56 - 1.5 + 5);
    expect(fantasyPoints({ ...line, ast: 10 }, w)).toBe(56 + 7.5 + 15);
  });
});

describe("weeks", () => {
  it("computes Monday-to-Monday bounds in the league timezone", () => {
    const { start, end } = weekBounds("2026-11-02", "America/New_York", 1);
    expect(start.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-09T05:00:00.000Z");
  });
  it("handles the DST change inside a week", () => {
    // US DST ended Sunday 2026-11-01; week 1 starts after it, week 0 would span it.
    const { start, end } = weekBounds("2026-10-26", "America/New_York", 1);
    expect(start.toISOString()).toBe("2026-10-26T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
  it("finds the week number for an instant", () => {
    expect(weekOf("2026-11-02", "America/New_York", new Date("2026-11-09T04:59:00Z"))).toBe(1);
    expect(weekOf("2026-11-02", "America/New_York", new Date("2026-11-09T05:00:00Z"))).toBe(2);
    expect(weekOf("2026-11-02", "America/New_York", new Date("2026-10-30T00:00:00Z"))).toBeLessThan(1);
  });
  it("finds the next Monday", () => {
    expect(nextMonday("2026-10-23")).toBe("2026-10-26");
    expect(nextMonday("2026-10-26")).toBe("2026-10-26");
    expect(nextMonday("2026-10-25")).toBe("2026-10-26");
  });
});

describe("roster", () => {
  it("checks slot eligibility", () => {
    expect(canFillSlot("G", "G")).toBe(true);
    expect(canFillSlot("G", "F")).toBe(false);
    expect(canFillSlot("C", "C")).toBe(true);
    expect(canFillSlot("UTIL", "C")).toBe(true);
    expect(canFillSlot("F", "SF")).toBe(true);
  });
  it("validates lineups against slot counts", () => {
    const s = DEFAULT_SETTINGS;
    const ok = [
      { playerId: "a", slot: "G", position: "G" },
      { playerId: "b", slot: "G", position: "G" },
      { playerId: "c", slot: "BN", position: "C" },
    ];
    expect(validateLineup(ok, s)).toBeNull();
    expect(validateLineup([...ok, { playerId: "d", slot: "G", position: "G" }], s)).toMatch(/Too many/);
    expect(validateLineup([{ playerId: "a", slot: "C", position: "G" }], s)).toMatch(/cannot play/);
  });
  it("places a new player in the first open eligible starter slot, else the bench", () => {
    const s = DEFAULT_SETTINGS;
    expect(firstOpenSlot([], "G", s)).toBe("G");
    expect(firstOpenSlot([{ playerId: "a", slot: "G", position: "G" }, { playerId: "b", slot: "G", position: "G" }], "G", s)).toBe("UTIL");
    const full = s.starterSlots.map((slot, i) => ({ playerId: `p${i}`, slot, position: "C" }));
    expect(firstOpenSlot(full, "C", s)).toBe("BN");
  });
});

describe("draft", () => {
  const order = ["a", "b", "c"];
  it("snakes", () => {
    const seq = Array.from({ length: 9 }, (_, i) => pickInfo(order, i + 1).teamId);
    expect(seq).toEqual(["a", "b", "c", "c", "b", "a", "a", "b", "c"]);
  });
  it("shuffles deterministically without losing teams", () => {
    expect(shuffled(order, 7)).toEqual(shuffled(order, 7));
    expect([...shuffled(order, 7)].sort()).toEqual(order);
  });
});

describe("schedule", () => {
  for (const n of [3, 4, 5, 6]) {
    it(`${n} teams: everyone plays once per week, no repeat until a full cycle`, () => {
      const teams = Array.from({ length: n }, (_, i) => `t${i}`);
      const cycle = n % 2 === 0 ? n - 1 : n;
      const sched = buildSchedule(teams, cycle);
      const seen = new Set<string>();
      for (const week of sched) {
        const used = week.flatMap((p) => [p.teamA, ...(p.teamB ? [p.teamB] : [])]);
        expect(new Set(used).size).toBe(used.length);
        for (const p of week) {
          if (!p.teamB) continue;
          const key = [p.teamA, p.teamB].sort().join("-");
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
        const byes = week.filter((p) => p.teamB === null).length;
        expect(byes).toBe(n % 2);
      }
      expect(seen.size).toBe((n * (n - 1)) / 2);
    });
  }
});

describe("standings and playoffs", () => {
  it("ranks by win pct, then head-to-head, then points for", () => {
    const s = computeStandings(["a", "b", "c"], [
      { teamA: "a", teamB: "b", scoreA: 100, scoreB: 90 },
      { teamA: "b", teamB: "c", scoreA: 100, scoreB: 90 },
      { teamA: "c", teamB: "a", scoreA: 100, scoreB: 90 },
    ]);
    // all 1-1; head-to-head is cyclic so points for decides: a=190, b=190, c=190 -> fall through, stable
    expect(s.map((x) => x.wins)).toEqual([1, 1, 1]);
  });
  it("ignores byes in the record", () => {
    const s = computeStandings(["a", "b"], [{ teamA: "a", teamB: null, scoreA: 0, scoreB: 0 }]);
    expect(s.every((x) => x.wins + x.losses + x.ties === 0)).toBe(true);
  });
  it("pairs best vs worst for 4 teams", () => {
    const r = playoffRound(["s1", "s2", "s3", "s4"]);
    expect(r.pairs).toEqual([{ high: "s1", low: "s4" }, { high: "s2", low: "s3" }]);
    expect(r.byes).toEqual([]);
  });
  it("gives top seeds byes when the field is not a power of two", () => {
    const r = playoffRound(["s1", "s2", "s3", "s4", "s5", "s6"]);
    expect(r.byes).toEqual(["s1", "s2"]);
    expect(r.pairs).toEqual([{ high: "s3", low: "s6" }, { high: "s4", low: "s5" }]);
  });
  it("2 teams is a final", () => {
    expect(playoffRound(["s1", "s2"]).pairs).toEqual([{ high: "s1", low: "s2" }]);
  });
});

describe("waivers", () => {
  const base = { rosterLimit: 11 };
  it("awards a contested player to the higher priority team, who then moves to the bottom", () => {
    const { results, priority } = processWaivers({
      ...base,
      claims: [
        { id: "c1", teamId: "B", addPlayerId: "p", dropPlayerId: null, createdAt: 1 },
        { id: "c2", teamId: "A", addPlayerId: "p", dropPlayerId: null, createdAt: 2 },
      ],
      priority: ["A", "B"],
      owned: new Map(),
      rosterCounts: new Map([["A", 5], ["B", 5]]),
    });
    expect(results.find((r) => r.id === "c2")!.status).toBe("won");
    expect(results.find((r) => r.id === "c1")!.status).toBe("lost");
    expect(priority).toEqual(["B", "A"]);
  });
  it("only one claim per player can win even with many claims", () => {
    const { results } = processWaivers({
      ...base,
      claims: ["A", "B", "C"].map((t, i) => ({ id: t, teamId: t, addPlayerId: "p", dropPlayerId: null, createdAt: i })),
      priority: ["C", "B", "A"],
      owned: new Map(),
      rosterCounts: new Map(),
    });
    expect(results.filter((r) => r.status === "won")).toHaveLength(1);
  });
  it("rejects an add that overflows the roster without a drop, accepts with one", () => {
    const run = (drop: string | null) =>
      processWaivers({
        ...base,
        claims: [{ id: "c", teamId: "A", addPlayerId: "p", dropPlayerId: drop, createdAt: 1 }],
        priority: ["A"],
        owned: new Map([["x", "A"]]),
        rosterCounts: new Map([["A", 11]]),
      }).results[0].status;
    expect(run(null)).toBe("invalid");
    expect(run("x")).toBe("won");
  });
  it("falls through to a team's next claim when the first is taken", () => {
    const { results } = processWaivers({
      ...base,
      claims: [
        { id: "a1", teamId: "A", addPlayerId: "p1", dropPlayerId: null, createdAt: 1 },
        { id: "a2", teamId: "A", addPlayerId: "p2", dropPlayerId: null, createdAt: 2 },
        { id: "b1", teamId: "B", addPlayerId: "p1", dropPlayerId: null, createdAt: 1 },
      ],
      priority: ["A", "B"],
      owned: new Map(),
      rosterCounts: new Map(),
    });
    expect(results.map((r) => r.status)).toEqual(["won", "won", "lost"].map((s, i) => (i === 2 ? "lost" : s)));
  });
});

describe("trades", () => {
  const items = [
    { playerId: "p1", fromTeamId: "A", toTeamId: "B" },
    { playerId: "p2", fromTeamId: "B", toTeamId: "A" },
  ];
  it("accepts a clean swap", () => {
    expect(
      validateTrade({ owned: new Map([["p1", "A"], ["p2", "B"]]), items, rosterCounts: new Map([["A", 11], ["B", 11]]), rosterLimit: 11 }).ok,
    ).toBe(true);
  });
  it("rejects a stale trade where a player has moved", () => {
    expect(
      validateTrade({ owned: new Map([["p1", "C"], ["p2", "B"]]), items, rosterCounts: new Map(), rosterLimit: 11 }).ok,
    ).toBe(false);
  });
  it("rejects a 2-for-1 that overflows the receiving roster", () => {
    const r = validateTrade({
      owned: new Map([["p1", "A"], ["p3", "A"], ["p2", "B"]]),
      items: [...items, { playerId: "p3", fromTeamId: "A", toTeamId: "B" }],
      rosterCounts: new Map([["A", 11], ["B", 11]]),
      rosterLimit: 11,
    });
    expect(r.ok).toBe(false);
  });
});
