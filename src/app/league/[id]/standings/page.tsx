import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { standingsFor } from "@/server/engine";
import { fmt1, leagueContext } from "@/server/page";

export default async function StandingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league, team } = await leagueContext(id);
  const { teams, standings } = await standingsFor(id);
  const name = new Map(teams.map((t) => [t.id, t.name]));
  const matchups = await db.select().from(schema.matchups).where(eq(schema.matchups.leagueId, id));
  const playoff = matchups.filter((m) => m.isPlayoff).sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
  const cut = Math.min(league.playoffTeams, teams.length);
  const weeks = [...new Set(matchups.filter((m) => !m.isPlayoff).map((m) => m.week))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-muted">
            <tr><th className="px-3 py-2 text-left">#</th><th className="text-left">Team</th><th>W-L-T</th><th>PF</th><th className="pr-3">PA</th></tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.teamId} className={`border-t border-line text-center ${s.teamId === team?.id ? "bg-blue-50" : ""} ${i === cut - 1 ? "border-b-2 border-b-accent" : ""}`}>
                <td className="px-3 py-2 text-left font-bold">{i + 1}</td>
                <td className="text-left font-semibold">{name.get(s.teamId)}</td>
                <td className="tabular-nums">{s.wins}-{s.losses}{s.ties ? `-${s.ties}` : ""}</td>
                <td className="tabular-nums">{fmt1(s.pointsFor)}</td>
                <td className="pr-3 tabular-nums">{fmt1(s.pointsAgainst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line px-3 py-2 text-xs text-muted">Top {cut} make the playoffs. Tiebreakers: win %, head-to-head, points for.</p>
      </section>

      {playoff.length ? (
        <section>
          <h2 className="label mb-2">Playoffs</h2>
          <ul className="space-y-2">
            {playoff.map((m) => (
              <li key={m.id} className="card grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-2 text-sm">
                <span className={`truncate font-semibold ${m.winnerId === m.teamAId ? "text-win" : ""}`}>{name.get(m.teamAId)}</span>
                <span className="text-center tabular-nums text-xs">
                  <div className="text-muted">Round {m.round} · Wk {m.week}</div>
                  {m.teamBId ? (m.finalizedAt ? `${fmt1(m.scoreA ?? 0)} – ${fmt1(m.scoreB ?? 0)}` : "vs") : "bye"}
                </span>
                <span className={`truncate text-right font-semibold ${m.winnerId === m.teamBId ? "text-win" : ""}`}>{m.teamBId ? name.get(m.teamBId) : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {weeks.length ? (
        <section>
          <h2 className="label mb-2">Schedule</h2>
          <div className="space-y-3">
            {weeks.map((w) => (
              <div key={w} className="card p-3">
                <div className="mb-1 text-xs font-bold text-muted">Week {w}</div>
                {matchups.filter((m) => !m.isPlayoff && m.week === w).map((m) => (
                  <div key={m.id} className="flex justify-between py-0.5 text-sm">
                    <span>{name.get(m.teamAId)} vs {m.teamBId ? name.get(m.teamBId) : "bye"}</span>
                    <span className="tabular-nums text-muted">{m.finalizedAt && m.teamBId ? `${fmt1(m.scoreA ?? 0)}–${fmt1(m.scoreB ?? 0)}` : ""}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
