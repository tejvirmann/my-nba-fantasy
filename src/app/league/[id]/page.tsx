import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import { RefreshBar } from "@/components/RefreshBar";
import { parseWeek, WeekBar } from "@/components/WeekBar";
import { abbrevName } from "@/lib/names";
import { computeWeek, currentWeek, type PlayerWeekView } from "@/server/engine";
import { orderLineup } from "@/server/lineup";
import { fmt1, leagueContext } from "@/server/page";

function maxWeek(l: { regularWeeks: number; status: string }) {
  return l.regularWeeks + (l.status === "playoffs" || l.status === "complete" ? 3 : 0);
}

function Cell({ p, slot, right }: { p: PlayerWeekView | null; slot: string; right?: boolean }) {
  if (!p) return <div className={`mcell ${right ? "r" : ""}`}><span className="s">{slot} · empty</span></div>;
  const c = p.resolution.counted;
  const line = p.games.find((g) => g.gameId === c?.gameId)?.line;
  return (
    <div className={`mcell ${right ? "r" : ""}`}>
      <span className="mav"><PlayerAvatar name={p.name} src={p.imageUrl} team={p.teamAbbr} size={36} /></span>
      <div className="min-w-0">
        <div className="nm"><a>{abbrevName(p.name)}</a></div>
        <div className="s">
          {p.teamAbbr} {p.position}
          {line ? ` · ${line.pts}/${line.reb}/${line.ast}` : ""}
          {p.injuryStatus ? ` · ${p.injuryStatus}` : ""}
        </div>
      </div>
      <span className="p tnum">{fmt1(p.counted)}</span>
    </div>
  );
}

export default async function MatchupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ week?: string; m?: string }> }) {
  const { id } = await params;
  const { week: weekParam, m: matchParam } = await searchParams;
  const { league, team } = await leagueContext(id);
  const current = currentWeek(league);
  const inSeason = (league.status === "active" || league.status === "playoffs" || league.status === "complete") && current >= 1;

  if (!inSeason) {
    const teamRows = await db.select().from(schema.teams).where(eq(schema.teams.leagueId, id));
    return (
      <div className="pad stack">
        <div className="card">
          <div className="sec"><span>Invite friends</span></div>
          <div className="pad">
            <div className="label">Invite code</div>
            <div className="text-3xl font-light tracking-[0.3em]">{league.inviteCode}</div>
            <p className="mt-2 text-sm text-muted">Friends join at <b>/join</b> with this code.</p>
          </div>
        </div>
        <div className="card">
          <div className="sec"><span>Teams ({teamRows.length})</span></div>
          {teamRows.map((t) => (<div key={t.id} className="rrow" style={{ padding: "12px 16px" }}>{t.name}</div>))}
        </div>
        {league.status === "setup" || league.status === "drafting" ? (
          <Link href={`/league/${id}/draft`} className="btn btn-primary w-full">Go to the draft room</Link>
        ) : (
          <div className="card pad text-sm text-muted">Week 1 starts {league.week1Start}.</div>
        )}
        <RefreshBar leagueId={id} />
      </div>
    );
  }

  const max = maxWeek(league);
  const week = parseWeek(weekParam, current, max);
  const [view, matchRows] = await Promise.all([
    computeWeek(id, week, new Date(), league),
    db.select().from(schema.matchups).where(and(eq(schema.matchups.leagueId, id), eq(schema.matchups.week, week))),
  ]);
  const byTeam = new Map(view.teams.map((t) => [t.team.id, t]));
  const mineMatch = team ? matchRows.find((m) => m.teamAId === team.id || m.teamBId === team.id) : undefined;
  // Any matchup in the league can be opened from the swipe strip; default is yours.
  const myMatch = matchRows.find((m) => m.id === matchParam) ?? mineMatch ?? matchRows[0];
  const viewingMine = !!team && !!myMatch && (myMatch.teamAId === team.id || myMatch.teamBId === team.id);
  const matchHref = (m: (typeof matchRows)[number]) => {
    const qs = new URLSearchParams();
    if (week !== current) qs.set("week", String(week));
    if (m.id !== mineMatch?.id) qs.set("m", m.id);
    const q = qs.toString();
    return `/league/${id}${q ? `?${q}` : ""}`;
  };
  const aId = myMatch?.teamAId ?? null;
  const bId = myMatch?.teamBId ?? null;
  const left = aId ? byTeam.get(team && bId === team.id ? bId : aId) : null;
  const rightTeam = aId ? byTeam.get(team && bId === team.id ? aId : (bId ?? "")) ?? null : null;
  const finalized = !!myMatch?.finalizedAt;
  const lLineup = left ? orderLineup(left.players, league.settings.starterSlots) : null;
  const rLineup = rightTeam ? orderLineup(rightTeam.players, league.settings.starterSlots) : null;
  const lTotal = left?.total ?? 0;
  const rTotal = rightTeam?.total ?? 0;

  return (
    <>
      <WeekBar basePath={`/league/${id}`} week={week} current={current} max={max} />
      {matchRows.length > 1 ? (
        <>
          <div className="sec"><span>All matchups · Week {week}</span><span className="swipe">Swipe →</span></div>
          <div className="mstrip">
            {matchRows.map((m) => {
              const a = byTeam.get(m.teamAId);
              const b = m.teamBId ? byTeam.get(m.teamBId) : null;
              const at = a?.total ?? 0;
              const bt = b?.total ?? 0;
              const isMine = m.id === mineMatch?.id;
              return (
                <Link key={m.id} href={matchHref(m)} scroll={false} className={`mcard ${m.id === myMatch?.id ? "on" : ""}`}>
                  <div className="mc-top">
                    <span className={`tag ${m.id === myMatch?.id ? "acc" : ""}`}>{isMine ? "Your matchup" : m.isPlayoff ? "Playoffs" : m.finalizedAt ? "Final" : "Live"}</span>
                  </div>
                  <div className={`mc-t ${at >= bt ? "lead" : ""}`}><span className="n">{a?.team.name}</span><b className="tnum">{fmt1(at)}</b></div>
                  <div className={`mc-t ${bt > at ? "lead" : ""}`}><span className="n">{b?.team.name ?? "Bye"}</span><b className="tnum">{b ? fmt1(bt) : "—"}</b></div>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
      {left ? (
        <>
          <div className="mhead">
            <div className="mteam">
              <TeamLogo team={left.team} size={64} />
              <div className="min-w-0">
                <div className="t">{left.team.name}</div>
                <div className="rec">{team?.id === left.team.id ? "You" : ""}{myMatch?.isPlayoff ? " · Playoffs" : ""}</div>
                <div className={`mscore tnum ${lTotal >= rTotal ? "lead" : ""}`}>{fmt1(lTotal)}</div>
              </div>
            </div>
            <div className="mvs">VS</div>
            <div className="mteam r">
              {rightTeam ? <TeamLogo team={rightTeam.team} size={64} /> : <span className="av lg" style={{ background: "#555b64" }}>BY</span>}
              <div className="min-w-0">
                <div className="t">{rightTeam?.team.name ?? "Bye week"}</div>
                <div className="rec">{finalized ? "Final" : view.settled ? "Final" : "In progress"}</div>
                <div className={`mscore tnum ${rTotal > lTotal ? "lead" : ""}`}>{rightTeam ? fmt1(rTotal) : "—"}</div>
              </div>
            </div>
          </div>
          {rightTeam ? (
            <div className="mbar" aria-hidden>
              <i style={{ width: `${(lTotal / Math.max(1, lTotal + rTotal)) * 100}%` }} />
            </div>
          ) : null}
        </>
      ) : null}

      <div className="grid2 side">
        <div>
          <div className="sec">
            <span>Starters</span>
            <span className="tag">{league.settings.lockMode === "strict" ? "Strict Lock-In" : "Open Lock-In"}</span>
          </div>
          {lLineup?.starters.map((row, i) => (
            <div key={i} className="mrow">
              <Cell p={row.player} slot={row.slot} />
              <div className="mslot">{row.slot}</div>
              <Cell p={rLineup?.starters[i]?.player ?? null} slot={row.slot} right />
            </div>
          ))}
          {!left ? <div className="pad text-sm text-muted">No matchup this week.</div> : null}
          {viewingMine && lLineup && lLineup.bench.length ? (
            <div className="sec">
              <span>Bench</span>
              <span style={{ fontWeight: 400, color: "var(--mut)", textTransform: "none", letterSpacing: 0 }}>{lLineup.bench.map((b) => abbrevName(b.name)).join(" · ")}</span>
            </div>
          ) : null}
          {left && viewingMine ? (
            <div className="pad text-right text-sm">
              <Link href={`/league/${id}/team`} className="font-semibold text-link">Set lineup & lock in games →</Link>
            </div>
          ) : null}
        </div>

        <div className="pad stack">
          <RefreshBar leagueId={id} />
        </div>
      </div>
    </>
  );
}
