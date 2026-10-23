import type { ScoringWeights, StatLine } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fantasy points for one stat line under a league's weights. Pure and deterministic. */
export function fantasyPoints(stat: StatLine, w: ScoringWeights): number {
  let total =
    stat.pts * w.pts +
    stat.reb * w.reb +
    stat.ast * w.ast +
    stat.stl * w.stl +
    stat.blk * w.blk +
    stat.tov * w.tov +
    stat.tpm * w.tpm +
    (stat.fgm ?? 0) * w.fgm +
    (stat.fga ?? 0) * w.fga +
    (stat.ftm ?? 0) * w.ftm +
    (stat.fta ?? 0) * w.fta;

  const tens = [stat.pts, stat.reb, stat.ast, stat.stl, stat.blk].filter((v) => v >= 10).length;
  if (tens >= 3) total += w.tripleDouble;
  if (tens >= 2) total += w.doubleDouble;
  return round2(total);
}
