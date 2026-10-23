import { describe, expect, it } from "vitest";
import { parseBoxScore, parseGame, ProviderShapeError } from "./espn";

const summary = {
  boxscore: {
    players: [
      {
        team: { abbreviation: "PHI" },
        statistics: [
          {
            labels: ["MIN", "PTS", "FG", "3PT", "FT", "REB", "AST", "TO", "STL", "BLK", "OREB", "DREB", "PF", "+/-"],
            athletes: [
              {
                athlete: { id: "4251", displayName: "Paul George", headshot: { href: "https://x/4251.png" }, position: { abbreviation: "F" } },
                stats: ["30", "39", "15-22", "6-12", "3-4", "5", "6", "0", "3", "0", "0", "5", "2", "+26"],
              },
              { athlete: { id: "1", displayName: "Bench Guy" }, didNotPlay: true, stats: [] },
              { athlete: { id: "2", displayName: "Zero Guy" }, stats: ["0", "0", "0-0", "0-0", "0-0", "0", "0", "0", "0", "0", "0", "0", "0", "0"] },
            ],
          },
        ],
      },
    ],
  },
};

describe("espn parsing", () => {
  it("normalizes a box score line and skips DNPs", () => {
    const rows = parseBoxScore("g1", summary);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ playerEspnId: "4251", pts: 39, reb: 5, ast: 6, stl: 3, tpm: 6, tpa: 12, fgm: 15, plusMinus: 26, teamAbbr: "PHI" });
  });
  it("fails loudly when the provider shape changes", () => {
    expect(() => parseBoxScore("g1", {})).toThrow(ProviderShapeError);
    const broken = structuredClone(summary);
    broken.boxscore.players[0].statistics[0].labels = ["MIN"];
    expect(() => parseBoxScore("g1", broken)).toThrow(/missing/);
  });
  it("parses game status", () => {
    const mk = (type: any) => ({
      id: "9",
      date: "2026-03-15T23:00Z",
      status: { type },
      competitions: [{ competitors: [{ homeAway: "home", team: { abbreviation: "A" }, score: "100" }, { homeAway: "away", team: { abbreviation: "B" }, score: "90" }] }],
    });
    expect(parseGame(mk({ completed: true, state: "post" })).status).toBe("final");
    expect(parseGame(mk({ completed: false, state: "in" })).status).toBe("live");
    expect(parseGame(mk({ completed: false, state: "pre" })).homeScore).toBeNull();
  });
});
