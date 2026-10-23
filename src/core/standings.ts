export type FinishedMatchup = {
  teamA: string;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
};

export type Standing = {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
};

export function computeStandings(teamIds: string[], matchups: FinishedMatchup[]): Standing[] {
  const m = new Map<string, Standing>(
    teamIds.map((id) => [id, { teamId: id, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }]),
  );
  for (const g of matchups) {
    const a = m.get(g.teamA);
    if (!a) continue;
    if (g.teamB === null) continue; // bye: no result, no points
    const b = m.get(g.teamB);
    if (!b) continue;
    a.pointsFor += g.scoreA;
    a.pointsAgainst += g.scoreB;
    b.pointsFor += g.scoreB;
    b.pointsAgainst += g.scoreA;
    if (g.scoreA > g.scoreB) {
      a.wins++;
      b.losses++;
    } else if (g.scoreB > g.scoreA) {
      b.wins++;
      a.losses++;
    } else {
      a.ties++;
      b.ties++;
    }
  }
  const winPct = (s: Standing) => {
    const gp = s.wins + s.losses + s.ties;
    return gp === 0 ? 0 : (s.wins + s.ties / 2) / gp;
  };
  const h2h = (x: string, y: string) => {
    let diff = 0;
    for (const g of matchups) {
      if (g.teamB === null) continue;
      if (g.teamA === x && g.teamB === y) diff += Math.sign(g.scoreA - g.scoreB);
      if (g.teamA === y && g.teamB === x) diff += Math.sign(g.scoreB - g.scoreA);
    }
    return diff;
  };
  const list = [...m.values()];
  // Tiebreakers: win pct, then head-to-head, then points for.
  return list.sort((a, b) => {
    const d = winPct(b) - winPct(a);
    if (d !== 0) return d;
    const h = h2h(b.teamId, a.teamId);
    if (h !== 0) return h;
    return b.pointsFor - a.pointsFor;
  });
}

export type BracketPair = { high: string; low: string | null };

/**
 * Next single-elimination round from survivors listed best seed first.
 * If the count is not a power of two, the top seeds get byes and the rest play (best vs worst).
 */
export function playoffRound(seeded: string[]): { pairs: BracketPair[]; byes: string[] } {
  const k = seeded.length;
  if (k < 2) return { pairs: [], byes: [...seeded] };
  let p = 1;
  while (p * 2 <= k) p *= 2;
  const playing = k === p ? k : 2 * (k - p);
  const byes = seeded.slice(0, k - playing);
  const field = seeded.slice(k - playing);
  const pairs: BracketPair[] = [];
  for (let i = 0; i < field.length / 2; i++) pairs.push({ high: field[i], low: field[field.length - 1 - i] });
  return { pairs, byes };
}
