import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { fantasyPoints } from "@/core/scoring";
import type { ScoringWeights, StatLine } from "@/core/types";

const { nbaGames, playerGameStats } = schema;

export type SeasonLine = {
  gp: number;
  /** Average fantasy points per game. */
  fpts: number;
  /** Best single game. Matters because only one game per week counts under Lock-In. */
  high: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
};

export type RecentGame = { label: string; pts: number; reb: number; ast: number; fpts: number };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function summarize(rows: StatLine[], weights: ScoringWeights): SeasonLine {
  const fp = rows.map((r) => fantasyPoints(r, weights));
  return {
    gp: rows.length,
    fpts: avg(fp),
    high: fp.length ? Math.max(...fp) : 0,
    pts: avg(rows.map((r) => r.pts)),
    reb: avg(rows.map((r) => r.reb)),
    ast: avg(rows.map((r) => r.ast)),
    stl: avg(rows.map((r) => r.stl)),
    blk: avg(rows.map((r) => r.blk)),
    tov: avg(rows.map((r) => r.tov)),
  };
}

/** Season lines for a handful of players (the draft table); one query, exact best-game math. */
export async function seasonLines(weights: ScoringWeights, espnIds: string[]): Promise<Map<string, SeasonLine>> {
  const out = new Map<string, SeasonLine>();
  if (!espnIds.length) return out;
  const rows = await db.select().from(playerGameStats).where(inArray(playerGameStats.playerEspnId, espnIds));
  const by = new Map<string, StatLine[]>();
  for (const r of rows) by.set(r.playerEspnId, [...(by.get(r.playerEspnId) ?? []), r]);
  for (const [id, lines] of by) out.set(id, summarize(lines, weights));
  return out;
}

/** Everything the player card shows: season averages, best game and the last five games. */
export async function playerCard(weights: ScoringWeights, espnId: string): Promise<{ season: SeasonLine; recent: RecentGame[] }> {
  const rows = await db
    .select({ s: playerGameStats, g: nbaGames })
    .from(playerGameStats)
    .innerJoin(nbaGames, eq(nbaGames.espnId, playerGameStats.gameEspnId))
    .where(and(eq(playerGameStats.playerEspnId, espnId), eq(nbaGames.status, "final")))
    .orderBy(desc(nbaGames.startTime));
  const recent = rows.slice(0, 5).map(({ s, g }) => ({
    label: g.homeAbbr === s.teamAbbr ? `vs ${g.awayAbbr}` : `@${g.homeAbbr}`,
    pts: s.pts,
    reb: s.reb,
    ast: s.ast,
    fpts: fantasyPoints(s, weights),
  }));
  return { season: summarize(rows.map((r) => r.s), weights), recent };
}

export type DefenseRank = { rank: number; of: number };

const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; value: Map<string, DefenseRank> }>();

/**
 * How each NBA defense ranks against each position: average fantasy points allowed, from our own box scores.
 * 1st = allows the fewest (toughest matchup), last = allows the most (easiest). Key: `${opponentAbbr}|${position}`.
 */
export async function defenseRanks(weights: ScoringWeights): Promise<Map<string, DefenseRank>> {
  const key = JSON.stringify(weights);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const rows = await db.execute(sql`
    select case when g.home_abbr = s.team_abbr then g.away_abbr else g.home_abbr end as opp,
      p.position as pos, count(*)::int as n,
      avg(s.pts)::float as pts, avg(s.reb)::float as reb, avg(s.ast)::float as ast, avg(s.stl)::float as stl,
      avg(s.blk)::float as blk, avg(s.tov)::float as tov, avg(s.tpm)::float as tpm,
      avg(s.fgm)::float as fgm, avg(s.fga)::float as fga, avg(s.ftm)::float as ftm, avg(s.fta)::float as fta
    from player_game_stats s
    join nba_games g on g.espn_id = s.game_espn_id
    join players p on p.espn_id = s.player_espn_id
    where p.position is not null
    group by 1, 2
  `);
  const byPos = new Map<string, { opp: string; fp: number }[]>();
  for (const r of rows as unknown as Record<string, number | string>[]) {
    if (Number(r.n) < 5) continue; // too few games to mean anything
    const stat: StatLine = {
      pts: Number(r.pts), reb: Number(r.reb), ast: Number(r.ast), stl: Number(r.stl), blk: Number(r.blk),
      tov: Number(r.tov), tpm: Number(r.tpm), fgm: Number(r.fgm), fga: Number(r.fga), ftm: Number(r.ftm), fta: Number(r.fta),
    };
    const pos = String(r.pos);
    byPos.set(pos, [...(byPos.get(pos) ?? []), { opp: String(r.opp), fp: fantasyPoints(stat, weights) }]);
  }
  const value = new Map<string, DefenseRank>();
  for (const [pos, list] of byPos) {
    list.sort((a, b) => a.fp - b.fp);
    list.forEach((x, i) => value.set(`${x.opp}|${pos}`, { rank: i + 1, of: list.length }));
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
