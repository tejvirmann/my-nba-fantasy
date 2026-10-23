import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { LockIcon } from "@/components/LockIcon";
import { LockSheet, type LockGame } from "@/components/LockSheet";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RefreshBar } from "@/components/RefreshBar";
import { parseWeek, WeekBar } from "@/components/WeekBar";
import { isFormatEnabled } from "@/core/formats";
import { SLOT_BENCH } from "@/core/types";
import { abbrevName } from "@/lib/names";
import { computeWeek, currentWeek, standingsFor, type PlayerWeekView } from "@/server/engine";
import { defenseRanks, ordinal } from "@/server/playerStats";
import { playerRankings } from "@/server/rankings";
import { orderLineup } from "@/server/lineup";
import { fmt1, gameTime, leagueContext } from "@/server/page";
import { dropPlayerAction, lockAction, renameTeam, saveAutoLock, saveLineup } from "../actions";

export default async function RosterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ week?: string }> }) {
  const { id } = await params;
  const { week: weekParam } = await searchParams;
  const { league, team } = await leagueContext(id);
  if (!team) return <div className="pad text-muted">The commissioner doesn&apos;t have a team in this league.</div>;
  const s = league.settings;
  const live = league.status === "active" || league.status === "playoffs" || league.status === "complete";
  if (!live) return <div className="pad text-muted">Your roster appears here once the draft is done.</div>;

  const current = Math.max(1, currentWeek(league));
  const max = league.regularWeeks + (league.status === "playoffs" || league.status === "complete" ? 3 : 0);
  const week = parseWeek(weekParam, current, max);
  const readOnly = week !== current || league.status === "complete";
  const view = await computeWeek(id, week, new Date(), league);
  const tv = view.teams.find((t) => t.team.id === team.id)!;
  const { starters, bench, departed } = orderLineup(tv.players, s.starterSlots);
  const weights = s.scoring;
  const [defense, ranks, { standings }, matchRows] = await Promise.all([
    defenseRanks(weights),
    playerRankings(weights),
    standingsFor(id),
    db.select().from(schema.matchups).where(and(eq(schema.matchups.leagueId, id), inArray(schema.matchups.week, [week - 1, week]))),
  ]);
  // Season rank by average fantasy points, across every player we have box scores for.
  const rankOf = new Map([...ranks.entries()].sort((a, b) => b[1].avg - a[1].avg).map(([espn], i) => [espn, i + 1]));
  const teamName = new Map(view.teams.map((t) => [t.team.id, t.team.name]));
  const totalOf = new Map(view.teams.map((t) => [t.team.id, t.total]));
  const mineStanding = standings.find((x) => x.teamId === team.id);
  const place = standings.findIndex((x) => x.teamId === team.id) + 1;
  const matchOf = (w: number) => matchRows.find((m) => m.week === w && (m.teamAId === team.id || m.teamBId === team.id));
  const opponentOf = (m: NonNullable<ReturnType<typeof matchOf>>) => (m.teamAId === team.id ? m.teamBId : m.teamAId);
  const curMatch = matchOf(week);
  const lastMatch = matchOf(week - 1);
  const slotOptions = [...new Set(s.starterSlots), SLOT_BENCH];
  const autoAllowed = isFormatEnabled(s, "auto_lock");
  const autoOn = autoAllowed && team.autoLock;
  const autoWhat = s.lockMode === "open" ? "Highest game" : `${team.autoLockThreshold}+ pts`;
  const modeNote =
    s.lockMode === "strict"
      ? "Strict Lock-In: lock a finished game before that player's next game starts. Players you don't lock count their last game of the week."
      : "Open Lock-In: every finished game stays available all week. With auto-pick on, the highest game counts.";

  const row = (p: PlayerWeekView) => {
    const counted = p.resolution.counted;
    const cg = p.games.find((g) => g.gameId === counted?.gameId);
    const nextGame = p.games.find((g) => g.status !== "final");
    const lockable = !readOnly && p.isStarter && p.onRoster && !p.lock && p.resolution.lockableGameIds.length > 0;
    const sheetGames: LockGame[] = p.games
      .filter((g) => g.status === "final" && g.played)
      .map((g) => ({
        gameId: g.gameId,
        detail: g.detail,
        stat: g.line ? `${g.line.pts} pts · ${g.line.reb} reb · ${g.line.ast} ast` : "",
        points: fmt1(g.points),
        counted: counted?.gameId === g.gameId,
        lockable: p.resolution.lockableGameIds.includes(g.gameId),
        action: lockAction.bind(null, id, p.playerId, g.gameId),
      }));
    const lockedBy = p.lock ? (p.lock.source === "auto" ? "auto-locked" : "locked by you") : null;
    const state = !p.isStarter ? "benched" : lockedBy ?? (cg ? (autoOn && s.lockMode === "open" ? "best so far" : "latest") : "—");
    const nextG = p.games.find((g) => g.status !== "final");
    const opp = nextG?.label ?? "–";
    const when = nextG ? (nextG.status === "live" ? "Live" : gameTime(nextG.start, league.timezone)) : "–";
    const oppAbbr = nextG?.label.replace(/^(vs|@)\s*/, "") ?? "";
    const dr = p.position ? defense.get(`${oppAbbr}|${p.position}`) : undefined;
    const ratio = dr ? dr.rank / dr.of : null;
    const rk = ranks.get(p.espnId);
    const lastPlayed = [...p.games].reverse().find((g) => g.status === "final" && g.played);

    return (
      <div key={p.playerId} className="rrow rtab">
        {readOnly || p.lock || !p.onRoster ? (
          <span className={`slot ${p.lock ? "on" : ""}`}>{p.lock ? <LockIcon /> : null}{p.slot}</span>
        ) : (
          <select name={`slot_${p.playerId}`} form="lineup" defaultValue={p.slot} className="slot" aria-label={`Slot for ${p.name}`}>
            {slotOptions.map((o) => (<option key={o} value={o}>{o}</option>))}
          </select>
        )}
        <PlayerAvatar name={p.name} src={p.imageUrl} team={p.teamAbbr} size={44} />
        <div className="who">
          <div className="nm">
            <a>{abbrevName(p.name)}</a>
            <span className="tm">{p.teamAbbr}</span>
            <span className="ps">{p.position}</span>
            {p.injuryStatus ? <span className="inj">{p.injuryStatus}</span> : null}
            {!p.onRoster ? <span className="tag">Left team</span> : null}
          </div>
          <div className="l2">Wk {fmt1(p.counted)} | Avg {p.avg ? fmt1(p.avg) : "–"}</div>
          <div className="l3">
            {cg ? <b>{cg.detail}</b> : nextGame ? nextGame.detail : p.games.length ? "No more games" : "No game this week"}
            {!readOnly && p.onRoster && !p.lock ? (
              <ActionForm action={dropPlayerAction.bind(null, id, p.playerId)} inline className="inline">
                <SubmitButton className="ml-3 text-[11px] text-muted underline" pendingText="…">Drop</SubmitButton>
              </ActionForm>
            ) : null}
          </div>
        </div>
        <span className="rx cx-opp">{opp}</span>
        <span className="rx cx-st">{when}</span>
        <span className="rx cx-or">{dr ? <span className={`oprk ${ratio! >= 0.7 ? "easy" : ratio! <= 0.33 ? "tough" : ""}`}>{ordinal(dr.rank)}</span> : "–"}</span>
        <span className="rx cx-pr tnum">{rankOf.get(p.espnId) ?? "–"}</span>
        <span className="rx cx-fp tnum">{rk ? fmt1(rk.avg * rk.gp) : "–"}</span>
        <span className="rx cx-av tnum">{p.avg ? fmt1(p.avg) : "–"}</span>
        <span className="rx cx-la tnum">{lastPlayed ? fmt1(lastPlayed.points) : "–"}</span>
        <div className="rpts">
          <b className="cx-sc tnum" style={{ color: p.isStarter ? undefined : "var(--mut)" }}>{fmt1(p.counted)}</b>
          <small>{state}</small>
          <div className="act cx-act">
            {p.lock ? (
              <span className="tag good"><LockIcon />Locked</span>
            ) : lockable ? (
              <LockSheet player={p.name} games={sheetGames} note={modeNote} auto={autoOn} />
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const ScoreRow = ({ label, m, cur }: { label: string; m: NonNullable<typeof curMatch>; cur: boolean }) => {
    const oppId = opponentOf(m);
    const mine = cur ? (totalOf.get(team.id) ?? 0) : m.teamAId === team.id ? (m.scoreA ?? 0) : (m.scoreB ?? 0);
    const theirs = cur ? (oppId ? (totalOf.get(oppId) ?? 0) : 0) : m.teamAId === team.id ? (m.scoreB ?? 0) : (m.scoreA ?? 0);
    return (
      <div>
        <div className="cap">{label}</div>
        <div className="mbox">
          <div className="mt"><span className="av sm" style={{ background: "#555b64" }}>{(oppId ? teamName.get(oppId) ?? "" : "BYE").slice(0, 2).toUpperCase()}</span><span>{oppId ? teamName.get(oppId) : "Bye week"}</span><b className={theirs > mine ? "" : "mut"}>{oppId ? fmt1(theirs) : "—"}</b></div>
          <div className="mt"><span className="av sm" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>{team.name.slice(0, 2).toUpperCase()}</span><span>{team.name}</span><b className={mine >= theirs ? "" : "mut"}>{fmt1(mine)}</b></div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="dcard only-d">
        <div className="tmhead">
          <span className="tmlogo">{team.name.slice(0, 2).toUpperCase()}</span>
          <div className="grow">
            <div className="tmname">{team.name} <small>{mineStanding ? `${mineStanding.wins}-${mineStanding.losses}${mineStanding.ties ? `-${mineStanding.ties}` : ""}` : "0-0"} <span className="mut">({ordinal(place || 1)} of {standings.length})</span></small></div>
            <div className="tmlinks"><span>{league.name}</span><i /><Link href={`/league/${id}/standings`}>Standings</Link><i /><Link href={`/league/${id}/activity`}>Waivers</Link><i /><Link href={`/league/${id}/players`}>Find players</Link></div>
          </div>
        </div>
        {curMatch || lastMatch ? (
          <div className="mpair">
            {lastMatch ? <ScoreRow label={`Last matchup · Week ${week - 1}`} m={lastMatch} cur={false} /> : <div />}
            {curMatch ? <ScoreRow label={`Current matchup · Week ${week}`} m={curMatch} cur /> : <div />}
          </div>
        ) : null}
      </div>
      <div className="setbar">
        <WeekBar basePath={`/league/${id}/team`} week={week} current={current} max={max} />
        <div className="toolbar" style={{ alignItems: "flex-start" }}>
          {autoAllowed && !readOnly ? (
            <details className="autopick">
              <summary><span className="pill auto"><span className={`toggle ${autoOn ? "on" : ""}`} />Auto Lock-In<small>{autoOn ? autoWhat : "Off"}</small></span></summary>
              <div className="card" style={{ marginTop: 8, minWidth: 280, position: "absolute", zIndex: 30 }}>
                <ActionForm action={saveAutoLock.bind(null, id)} className="pad stack">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" name="enabled" defaultChecked={team.autoLock} className="h-4 w-4" />
                    Auto Lock-In for me
                  </label>
                  <p className="text-xs text-muted">
                    {s.lockMode === "open"
                      ? "Counts each player's highest game of the week. You can still lock a game yourself any time before the week ends."
                      : "Strict league: a game can only be locked before the player's next game starts, so Auto locks the first finished game at or above the threshold. Otherwise the last game counts."}
                  </p>
                  {s.lockMode === "strict" ? (
                    <label className="flex items-center gap-2 text-sm">
                      Threshold
                      <input name="threshold" type="number" step="1" min="0" max="300" defaultValue={team.autoLockThreshold} className="input !w-24 !py-1" />
                      pts
                    </label>
                  ) : (
                    <input type="hidden" name="threshold" value={team.autoLockThreshold} />
                  )}
                  <SubmitButton className="btn btn-primary btn-sm">Save</SubmitButton>
                </ActionForm>
              </div>
            </details>
          ) : null}
          <Link href={`/league/${id}`} className="pill blue">Matchup ›</Link>
          <Link href={`/league/${id}/players`} className="pill blue">+ Add</Link>
        </div>
      </div>

      {autoOn && !readOnly ? (
        <div className="pad" style={{ paddingBottom: 0 }}>
          <div className="banner note text-[13px]">
            <div><b>Auto Lock-In is on</b><div className="sub">{s.lockMode === "open" ? "Each starter's highest-scoring game counts. Tap Auto on a row to lock a game yourself." : `We lock a finished game at ${team.autoLockThreshold}+ points before the player's next tip-off. Tap Auto on a row to lock one yourself.`}</div></div>
          </div>
        </div>
      ) : null}

      {readOnly ? (
        <div className="pad" style={{ paddingBottom: 0 }}>
          <div className="banner text-sm">Viewing Week {week}. Lineups and locks can only be changed in the current week.</div>
        </div>
      ) : null}

      <div className="sec" style={{ marginTop: 12 }}>
        <span>Starters</span>
        <div className="cols rcols"><span className="cx-act">LOCK-IN</span><span className="cx-opp">OPP</span><span className="cx-st">STATUS</span><span className="cx-sc">SCORE</span><span className="cx-or" title="Opponent defense rank vs this position. Last = easiest matchup">OPRK</span><span className="cx-pr">PRK</span><span className="cx-fp">FPTS</span><span className="cx-av">AVG</span><span className="cx-la">LAST</span></div>
      </div>
      {starters.map(({ slot, player }, i) => (player ? row(player) : <div key={i} className="rrow"><span className="slot">{slot}</span><span className="text-sm text-muted">Empty slot</span></div>))}

      <div className="sec">
        <span>Bench</span>
        <div className="cols rcols"><span className="cx-act">LOCK-IN</span><span className="cx-opp">OPP</span><span className="cx-st">STATUS</span><span className="cx-sc">SCORE</span><span className="cx-or" title="Opponent defense rank vs this position. Last = easiest matchup">OPRK</span><span className="cx-pr">PRK</span><span className="cx-fp">FPTS</span><span className="cx-av">AVG</span><span className="cx-la">LAST</span></div>
      </div>
      {bench.length ? bench.map(row) : <div className="pad text-sm text-muted">Bench is empty.</div>}
      {departed.length ? (
        <>
          <div className="sec"><span>Locked, then left your team</span></div>
          {departed.map(row)}
        </>
      ) : null}

      <div className="pad stack">
        <div className="legend">
          <b>OPRK</b> is how the opponent&apos;s defense ranks against that position this season: <span className="oprk easy">last</span> is the easiest matchup, <span className="oprk tough">1st</span> the toughest. <b>PRK</b> is the player&apos;s season rank by fantasy points per game.
          <div style={{ marginTop: 6 }}>{modeNote}</div>
        </div>
        <RefreshBar leagueId={id} />
        <ActionForm action={renameTeam.bind(null, id)} className="card pad flex items-center gap-2">
          <input name="name" defaultValue={team.name} className="input" maxLength={40} aria-label="Team name" />
          <SubmitButton className="btn btn-sm">Rename</SubmitButton>
        </ActionForm>
      </div>

      {!readOnly ? (
        <ActionForm id="lineup" action={saveLineup.bind(null, id)} className="sticky bottom-3 z-10 px-4">
          <SubmitButton className="btn btn-primary w-full shadow-lg">Save lineup</SubmitButton>
        </ActionForm>
      ) : null}
    </>
  );
}
