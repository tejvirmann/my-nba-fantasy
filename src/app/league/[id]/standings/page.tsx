import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { TeamLogo } from "@/components/TeamLogo";
import { standingsFor } from "@/server/engine";
import { fmt1, leagueContext } from "@/server/page";

export default async function StandingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league, team } = await leagueContext(id);
  const { teams, standings } = await standingsFor(id);
  const name = new Map(teams.map((t) => [t.id, t.name]));
  const byId = new Map(teams.map((t) => [t.id, t]));
  const matchups = await db.select().from(schema.matchups).where(eq(schema.matchups.leagueId, id));
  const playoff = matchups.filter((m) => m.isPlayoff).sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
  const cut = Math.min(league.playoffTeams, teams.length);
  const weeks = [...new Set(matchups.filter((m) => !m.isPlayoff).map((m) => m.week))].sort((a, b) => a - b);
  const mine = team?.id;

  return (
    <div className="grid2 side">
      <div>
        <div className="sec"><span>Standings</span></div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl stbl">
            <thead>
              <tr><th>#</th><th>Team</th><th className="c">{standings.some((s) => s.ties) ? "W-L-T" : "W-L"}</th><th className="r">PF</th><th className="r">PA</th></tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.teamId} className={s.teamId === mine ? "hl" : ""} style={i === cut - 1 ? { boxShadow: "inset 0 -2px 0 var(--accent)" } : undefined}>
                  <td><b>{i + 1}</b></td>
                  <td className="tn"><span className="row" style={{ gap: 8 }}><TeamLogo team={byId.get(s.teamId)!} size={26} /><b style={{ fontWeight: 600 }}>{name.get(s.teamId)}</b></span>{s.teamId === mine ? <span className="tag acc" style={{ marginLeft: 6 }}>You</span> : null}</td>
                  <td className="c tnum">{s.wins}-{s.losses}{s.ties ? `-${s.ties}` : ""}</td>
                  <td className="r tnum">{fmt1(s.pointsFor)}</td>
                  <td className="r tnum">{fmt1(s.pointsAgainst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pad text-[13px] text-muted">Top {cut} make the playoffs. Tiebreakers: win %, head-to-head, points for.</p>

        {weeks.length ? (
          <>
            <div className="sec"><span>Schedule</span></div>
            {weeks.map((w) => (
              <div key={w} style={{ borderBottom: "1px solid #eee" }}>
                <div className="px-4 pt-3 text-xs font-bold text-muted">Week {w}</div>
                {matchups.filter((m) => !m.isPlayoff && m.week === w).map((m) => (
                  <div key={m.id} className="flex justify-between px-4 py-1 text-sm">
                    <span>{name.get(m.teamAId)} vs {m.teamBId ? name.get(m.teamBId) : "bye"}</span>
                    <span className="tnum text-muted">{m.finalizedAt && m.teamBId ? `${fmt1(m.scoreA ?? 0)}–${fmt1(m.scoreB ?? 0)}` : ""}</span>
                  </div>
                ))}
                <div className="h-2" />
              </div>
            ))}
          </>
        ) : null}
      </div>

      <div className="pad">
        <div className="card">
          <div className="sec"><span>Playoff bracket</span></div>
          <div className="pad stack">
            {playoff.length === 0 ? <p className="text-sm text-muted">Starts after the regular season. Top {cut} qualify.</p> : null}
            {playoff.map((m) => (
              <div key={m.id} className="match">
                <div className={`t ${m.winnerId === m.teamAId ? "w" : ""}`}><span>{name.get(m.teamAId)}</span><span className="tnum">{m.finalizedAt ? fmt1(m.scoreA ?? 0) : ""}</span></div>
                {m.teamBId ? (
                  <div className={`t ${m.winnerId === m.teamBId ? "w" : ""}`}><span>{name.get(m.teamBId)}</span><span className="tnum">{m.finalizedAt ? fmt1(m.scoreB ?? 0) : ""}</span></div>
                ) : (
                  <div className="t"><span className="text-muted">Bye</span></div>
                )}
                <div className="px-3 pb-2 text-[11px] text-muted">Round {m.round} · Week {m.week}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
