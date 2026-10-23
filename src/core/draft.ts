/** Snake draft helpers. `order` is the team order for round 1. */

export function totalPicks(teamCount: number, rounds: number): number {
  return teamCount * rounds;
}

export function pickInfo(order: string[], overall: number): { round: number; teamId: string; indexInRound: number } {
  const n = order.length;
  const round = Math.ceil(overall / n);
  const i = (overall - 1) % n;
  const indexInRound = round % 2 === 1 ? i : n - 1 - i;
  return { round, teamId: order[indexInRound], indexInRound };
}

/** Deterministic Fisher-Yates using a small seeded PRNG so a draft order can be reproduced. */
export function shuffled<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
