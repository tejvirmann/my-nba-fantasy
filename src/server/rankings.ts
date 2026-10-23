import { sql } from "drizzle-orm";
import { db } from "@/db";
import { fantasyPoints } from "@/core/scoring";
import type { ScoringWeights } from "@/core/types";

export type Ranking = { gp: number; avg: number; score: number };

/**
 * Average fantasy points per game over every stored box score, lightly discounted for small samples.
 * Used to order the draft pool and to pick for a manager whose timer runs out.
 */
const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: Map<string, Ranking> }>();

export async function playerRankings(weights: ScoringWeights): Promise<Map<string, Ranking>> {
  const key = JSON.stringify(weights);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = await computeRankings(weights);
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function computeRankings(weights: ScoringWeights): Promise<Map<string, Ranking>> {
  const rows = await db.execute(sql`
    select player_espn_id as id,
      count(*)::int as gp,
      avg(pts)::float as pts, avg(reb)::float as reb, avg(ast)::float as ast, avg(stl)::float as stl,
      avg(blk)::float as blk, avg(tov)::float as tov, avg(tpm)::float as tpm,
      avg(fgm)::float as fgm, avg(fga)::float as fga, avg(ftm)::float as ftm, avg(fta)::float as fta
    from player_game_stats
    group by player_espn_id
  `);
  const out = new Map<string, Ranking>();
  for (const r of rows as unknown as Record<string, number | string>[]) {
    const stat = {
      pts: Number(r.pts), reb: Number(r.reb), ast: Number(r.ast), stl: Number(r.stl), blk: Number(r.blk),
      tov: Number(r.tov), tpm: Number(r.tpm), fgm: Number(r.fgm), fga: Number(r.fga), ftm: Number(r.ftm), fta: Number(r.fta),
    };
    const gp = Number(r.gp);
    const avg = fantasyPoints(stat, weights);
    out.set(String(r.id), { gp, avg, score: avg * Math.min(gp, 30) / 30 });
  }
  return out;
}
