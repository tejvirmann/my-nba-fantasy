import type { BasketballDataProvider, ProviderGame, ProviderPlayer, ProviderStatLine } from "./types";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";

/** ESPN's response shape is unofficial and can change; fail loudly with a clear message when it does. */
export class ProviderShapeError extends Error {}

async function getJson(path: string, attempt = 1): Promise<any> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "User-Agent": "Mozilla/5.0 (my-nba-fantasy)" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`ESPN ${res.status} for ${path}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 3) throw err;
    await new Promise((r) => setTimeout(r, 400 * attempt));
    return getJson(path, attempt + 1);
  }
}

const int = (v: unknown): number => {
  const n = Number(String(v ?? "").replace("+", ""));
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};
const made = (v: unknown): [number, number] => {
  const [m, a] = String(v ?? "0-0").split("-");
  return [int(m), int(a)];
};

export function parseGame(e: any): ProviderGame {
  const comp = e?.competitions?.[0];
  const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
  const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
  if (!e?.id || !e?.date || !home?.team?.abbreviation || !away?.team?.abbreviation) {
    throw new ProviderShapeError("ESPN scoreboard event is missing id/date/competitors");
  }
  const st = e.status?.type;
  const status = st?.completed ? "final" : st?.state === "in" ? "live" : "scheduled";
  return {
    espnId: String(e.id),
    startTime: new Date(e.date),
    status,
    homeAbbr: home.team.abbreviation,
    awayAbbr: away.team.abbreviation,
    homeScore: status === "scheduled" ? null : int(home.score),
    awayScore: status === "scheduled" ? null : int(away.score),
  };
}

export function parseBoxScore(gameEspnId: string, summary: any): ProviderStatLine[] {
  const teams = summary?.boxscore?.players;
  if (!Array.isArray(teams)) throw new ProviderShapeError("ESPN summary has no boxscore.players");
  const out: ProviderStatLine[] = [];
  for (const team of teams) {
    const group = team?.statistics?.[0];
    if (!group) continue;
    const labels: string[] = group.labels ?? [];
    for (const need of ["MIN", "PTS", "REB", "AST", "STL", "BLK", "TO", "3PT"]) {
      if (!labels.includes(need)) throw new ProviderShapeError(`ESPN box score is missing the ${need} column`);
    }
    const ix = (l: string) => labels.indexOf(l);
    for (const a of group.athletes ?? []) {
      if (a.didNotPlay || !a.stats?.length) continue; // DNP: no performance
      const s = a.stats as string[];
      const [tpm, tpa] = made(s[ix("3PT")]);
      const [fgm, fga] = made(s[ix("FG")]);
      const [ftm, fta] = made(s[ix("FT")]);
      const minutes = int(s[ix("MIN")]);
      if (minutes === 0 && int(s[ix("PTS")]) === 0 && int(s[ix("REB")]) === 0 && int(s[ix("AST")]) === 0) continue;
      out.push({
        gameEspnId,
        playerEspnId: String(a.athlete.id),
        teamAbbr: team.team.abbreviation,
        name: a.athlete.displayName,
        imageUrl: a.athlete.headshot?.href ?? null,
        position: a.athlete.position?.abbreviation ?? null,
        minutes,
        pts: int(s[ix("PTS")]),
        reb: int(s[ix("REB")]),
        ast: int(s[ix("AST")]),
        stl: int(s[ix("STL")]),
        blk: int(s[ix("BLK")]),
        tov: int(s[ix("TO")]),
        tpm,
        tpa,
        fgm,
        fga,
        ftm,
        fta,
        oreb: int(s[ix("OREB")]),
        dreb: int(s[ix("DREB")]),
        pf: int(s[ix("PF")]),
        plusMinus: int(s[ix("+/-")]),
      });
    }
  }
  return out;
}

export function parseRoster(teamAbbr: string, data: any): ProviderPlayer[] {
  if (!Array.isArray(data?.athletes)) throw new ProviderShapeError("ESPN roster has no athletes");
  return data.athletes.map((a: any) => ({
    espnId: String(a.id),
    name: a.displayName ?? a.fullName,
    teamAbbr,
    position: a.position?.abbreviation ?? null,
    jersey: a.jersey ?? null,
    imageUrl: a.headshot?.href ?? null,
    injuryStatus: a.injuries?.[0]?.status ?? null,
  }));
}

export const espn: BasketballDataProvider = {
  async getTeamIds() {
    const d = await getJson("/teams");
    const teams = d?.sports?.[0]?.leagues?.[0]?.teams;
    if (!Array.isArray(teams)) throw new ProviderShapeError("ESPN teams list changed shape");
    return teams.map((t: any) => ({ id: String(t.team.id), abbr: t.team.abbreviation as string }));
  },
  async getRoster(teamId) {
    const d = await getJson(`/teams/${teamId}/roster`);
    return parseRoster(d?.team?.abbreviation ?? "", d);
  },
  async getGames(date) {
    const d = await getJson(`/scoreboard?dates=${date}`);
    return (d.events ?? []).map(parseGame);
  },
  async getBoxScore(gameEspnId) {
    const d = await getJson(`/summary?event=${gameEspnId}`);
    return parseBoxScore(gameEspnId, d);
  },
};

export const provider: BasketballDataProvider = espn;
