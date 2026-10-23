/** Round-robin using the circle method. Odd team counts give each team a bye (teamB = null). */

export type Pairing = { teamA: string; teamB: string | null };

export function roundRobinRound(teamIds: string[], round: number): Pairing[] {
  const teams: (string | null)[] = [...teamIds];
  if (teams.length % 2 === 1) teams.push(null);
  const n = teams.length;
  const fixed = teams[0];
  const rest = teams.slice(1);
  const r = round % (n - 1);
  const rotated = [...rest.slice(rest.length - r), ...rest.slice(0, rest.length - r)];
  const line = [fixed, ...rotated];
  const out: Pairing[] = [];
  for (let i = 0; i < n / 2; i++) {
    const a = line[i];
    const b = line[n - 1 - i];
    if (a === null && b === null) continue;
    if (a === null) out.push({ teamA: b!, teamB: null });
    else out.push({ teamA: a, teamB: b });
  }
  return out;
}

/** Pairings for weeks 1..weeks. */
export function buildSchedule(teamIds: string[], weeks: number): Pairing[][] {
  return Array.from({ length: weeks }, (_, w) => roundRobinRound(teamIds, w));
}
