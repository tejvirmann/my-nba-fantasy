// Phase 0 spike: fetch one day's finished NBA games from ESPN and print normalized player stat lines.
// Run: npx tsx scripts/espn-spike.ts [YYYYMMDD]

const BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";

type PlayerGameStat = {
  gameId: string;
  playerId: string;
  name: string;
  team: string;
  imageUrl: string | null;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  threePm: number;
};

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function normalize(gameId: string, summary: any): PlayerGameStat[] {
  const rows: PlayerGameStat[] = [];
  for (const team of summary.boxscore?.players ?? []) {
    const group = team.statistics?.[0];
    if (!group) continue;
    const idx = (label: string) => group.labels.indexOf(label);
    for (const a of group.athletes ?? []) {
      if (a.didNotPlay || !a.stats?.length) continue; // DNP: no performance
      const n = (label: string) => Number(a.stats[idx(label)]) || 0;
      rows.push({
        gameId,
        playerId: a.athlete.id,
        name: a.athlete.displayName,
        team: team.team.abbreviation,
        imageUrl: a.athlete.headshot?.href ?? null,
        min: n("MIN"),
        pts: n("PTS"),
        reb: n("REB"),
        ast: n("AST"),
        stl: n("STL"),
        blk: n("BLK"),
        tov: n("TO"),
        threePm: Number(String(a.stats[idx("3PT")]).split("-")[0]) || 0,
      });
    }
  }
  return rows;
}

const date = process.argv[2] ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
const board = await getJson(`${BASE}/scoreboard?dates=${date}`);
const finals = (board.events ?? []).filter((e: any) => e.status.type.completed);
console.log(`${date}: ${board.events?.length ?? 0} games, ${finals.length} final`);

for (const e of finals) {
  const rows = normalize(e.id, await getJson(`${BASE}/summary?event=${e.id}`));
  const top = [...rows].sort((a, b) => b.pts - a.pts)[0];
  console.log(`${e.name} (${e.id}): ${rows.length} player lines; top scorer ${top?.name} ${top?.pts} pts`);
}
