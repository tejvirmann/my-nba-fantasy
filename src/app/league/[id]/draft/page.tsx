import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Countdown } from "@/components/Countdown";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { pickInfo, totalPicks } from "@/core/draft";
import { abbrevName } from "@/lib/names";
import { autoPickExpired, draftBoard, getDraft } from "@/server/draft";
import { fmt1, leagueContext } from "@/server/page";
import { PlayerCard } from "@/components/PlayerCard";
import { playerCard, seasonLines } from "@/server/playerStats";
import { playerPool, teamRoster } from "@/server/roster";
import { draftAdmin, pickAction } from "../actions";

export default async function DraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; q?: string; pos?: string; p?: string }>;
}) {
  const { id } = await params;
  const { tab, q, pos, p: pickedParam } = await searchParams;
  const ctx = await leagueContext(id);
  let { league } = ctx;
  const { team, isCommissioner } = ctx;

  // Serverless has no timers: overdue picks are made when someone looks at the room.
  if (league.status === "drafting") {
    await autoPickExpired(league);
    [league] = await db.select().from(schema.leagues).where(eq(schema.leagues.id, id));
  }
  const draft = await getDraft(id);
  const teams = await db.select().from(schema.teams).where(eq(schema.teams.leagueId, id));
  const name = new Map(teams.map((t) => [t.id, t.name]));

  if (!draft) {
    return (
      <div className="pad stack" style={{ maxWidth: 560 }}>
        <div className="card">
          <div className="sec"><span>Draft not set up</span></div>
          <div className="pad stack">
            <p className="text-sm text-muted">{teams.length} team{teams.length === 1 ? "" : "s"} joined. Invite code <b className="tracking-widest">{league.inviteCode}</b>.</p>
            {isCommissioner ? (
              <ActionForm action={draftAdmin.bind(null, id, "create")}>
                <SubmitButton className="btn btn-primary">Randomize draft order</SubmitButton>
              </ActionForm>
            ) : (
              <p className="text-sm text-muted">The commissioner will set the draft order.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const board = await draftBoard(draft.id);
  const live = draft.status === "live" || draft.status === "paused";
  const done = draft.status === "done";
  const total = totalPicks(draft.order.length, draft.rounds);
  const onClock = live && draft.currentPick <= total ? pickInfo(draft.order, draft.currentPick) : null;
  const showHistory = tab === "history" || !live;
  const myTurn = !!team && onClock?.teamId === team.id && draft.status === "live";
  const pickedIds = board.map((b) => b.player.id);
  const [pool, mine] = await Promise.all([
    live && !showHistory ? playerPool(league, { q, position: pos, limit: 40, excludeIds: pickedIds }) : Promise.resolve([]),
    team ? teamRoster(team.id) : Promise.resolve([]),
  ]);

  const weights = league.settings.scoring;
  const stats = await seasonLines(weights, pool.map((p) => p.espnId));
  const selected = pool.find((p) => p.id === pickedParam) ?? pool[0] ?? null;
  const card = selected ? await playerCard(weights, selected.espnId) : null;
  const here = (extra: Record<string, string>) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (pos) qs.set("pos", pos);
    for (const [k, v] of Object.entries(extra)) qs.set(k, v);
    return `/league/${id}/draft?${qs}`;
  };
  const cardEl =
    selected && card ? (
      <PlayerCard
        player={selected}
        season={card.season}
        recent={card.recent}
        draftAction={myTurn ? pickAction.bind(null, id, selected.id, draft.currentPick) : undefined}
      />
    ) : null;

  // Upcoming pick tiles, with a ROUND divider where the round changes.
  const tiles: { key: string; round?: number; overall?: number; teamId?: string }[] = [];
  if (live && onClock) {
    let lastRound = onClock.round;
    for (let n = draft.currentPick + 1; n <= Math.min(total, draft.currentPick + 9); n++) {
      const info = pickInfo(draft.order, n);
      if (info.round !== lastRound) {
        tiles.push({ key: `r${info.round}`, round: info.round });
        lastRound = info.round;
      }
      tiles.push({ key: `p${n}`, overall: n, teamId: info.teamId });
    }
  }

  return (
    <>
      {live ? <AutoRefresh seconds={4} /> : null}
      <div className="dr-strip">
        <div className="dr-clock">
          <small>{done ? "DRAFT" : draft.status === "paused" ? "PAUSED" : onClock ? `RND ${onClock.round} OF ${draft.rounds}` : "DRAFT"}</small>
          <b className="tnum">{draft.status === "live" ? <Countdown deadline={draft.deadline?.toISOString() ?? null} /> : done ? "Done" : "--"}</b>
        </div>
        <div className="dr-otc">
          <small>{onClock ? `ON THE CLOCK: PICK ${draft.currentPick}` : done ? "COMPLETE" : "NOT STARTED"}</small>
          <b>{onClock ? name.get(onClock.teamId) : done ? "Good luck this season" : "Waiting to start"}</b>
        </div>
        {tiles.map((t) =>
          t.round ? (
            <div key={t.key} className="dr-tile" style={{ background: "transparent" }}><b style={{ fontSize: 13 }}>ROUND {t.round}</b></div>
          ) : (
            <div key={t.key} className={`dr-tile ${t.teamId === team?.id ? "me" : ""}`}>
              <b>PICK {t.overall}</b>
              <i>{name.get(t.teamId!)}</i>
            </div>
          ),
        )}
      </div>

      <div className="dr-body">
        <aside className="dr-col left">
          <h3>Your roster ({mine.length})</h3>
          {mine.map((r) => (
            <div key={r.player.id} className="dr-q">
              <span className="rk" style={{ width: 44 }}>{r.player.position}</span>
              <span className="lnk">{abbrevName(r.player.name)}</span>
              <span className="ml-auto text-xs text-muted">{r.player.teamAbbr}</span>
            </div>
          ))}
          {mine.length === 0 ? <div className="dr-q text-muted">No picks yet.</div> : null}
          {isCommissioner ? (
            <>
              <h3 style={{ marginTop: 8 }}>Commissioner</h3>
              <div className="pad flex flex-wrap gap-2">
                {draft.status === "pending" ? (
                  <>
                    <ActionForm action={draftAdmin.bind(null, id, "start")} inline><SubmitButton className="btn btn-primary btn-sm">Start draft</SubmitButton></ActionForm>
                    <ActionForm action={draftAdmin.bind(null, id, "create")} inline><SubmitButton className="btn btn-sm">Re-randomize</SubmitButton></ActionForm>
                  </>
                ) : null}
                {draft.status === "live" ? (
                  <>
                    <ActionForm action={draftAdmin.bind(null, id, "pause")} inline><SubmitButton className="btn btn-sm">Pause</SubmitButton></ActionForm>
                    <ActionForm action={draftAdmin.bind(null, id, "autopick")} inline><SubmitButton className="btn btn-sm">Auto-pick now</SubmitButton></ActionForm>
                  </>
                ) : null}
                {draft.status === "paused" ? (
                  <ActionForm action={draftAdmin.bind(null, id, "resume")} inline><SubmitButton className="btn btn-primary btn-sm">Resume</SubmitButton></ActionForm>
                ) : null}
              </div>
            </>
          ) : null}
        </aside>

        <section className="dr-col">
          <div className="dr-headline">
            <span className="av lg" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              {(onClock ? name.get(onClock.teamId)! : team?.name ?? "HL").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <b>{myTurn ? "You're on the clock!" : onClock ? `${name.get(onClock.teamId)} is on the clock` : done ? "Draft complete" : "Draft room"}</b>
              <span>{onClock ? `Round ${onClock.round}, Pick ${draft.currentPick}` : `${board.length} picks made`}</span>
            </div>
          </div>
          <div className="dr-tabs">
            <Link href={`/league/${id}/draft`} className={!showHistory ? "on" : ""}>Players</Link>
            <Link href={`/league/${id}/draft?tab=history`} className={showHistory ? "on" : ""}>Pick History</Link>
          </div>

          {live && !showHistory ? (
            <>
              <form className="dr-filters" role="search">
                <select name="pos" defaultValue={pos ?? ""} className="pill" aria-label="Position">
                  <option value="">All Pos.</option>
                  <option value="G">G</option>
                  <option value="F">F</option>
                  <option value="C">C</option>
                </select>
                <input name="q" defaultValue={q ?? ""} placeholder="Player name" className="input" style={{ maxWidth: 260 }} aria-label="Search players" />
                <button className="btn btn-primary btn-sm">Search</button>
              </form>
              {cardEl ? <div className="only-m" style={{ borderBottom: "1px solid var(--hair)" }}>{cardEl}</div> : null}
              <div style={{ overflowX: "auto" }}>
                <table className="tbl dtbl">
                  <thead>
                    <tr><th>PLAYER</th><th className="c">FPTS</th><th className="c">HIGH</th><th className="c">PTS</th><th className="c">REB</th><th className="c">AST</th><th className="c hm">STL</th><th className="c hm">BLK</th><th /></tr>
                  </thead>
                  <tbody>
                    {pool.map((p) => {
                      const st = stats.get(p.espnId);
                      const n = (v: number | undefined) => (st && st.gp ? fmt1(v ?? 0) : "–");
                      return (
                        <tr key={p.id} className={p.id === selected?.id ? "sel" : ""}>
                          <td>
                            <Link href={here({ p: p.id })} scroll={false} className="row" style={{ gap: 12 }}>
                              <PlayerAvatar name={p.name} src={p.imageUrl} team={p.teamAbbr} size={40} />
                              <div>
                                <b className="pnm">{p.name}</b>
                                <div className="sub" style={{ fontSize: 12 }}>{p.teamAbbr} · {p.position}{p.injuryStatus ? <> <span className="inj">{p.injuryStatus}</span></> : null}</div>
                              </div>
                            </Link>
                          </td>
                          <td className="c tnum"><b>{n(st?.fpts)}</b></td>
                          <td className="c tnum">{n(st?.high)}</td>
                          <td className="c tnum">{n(st?.pts)}</td>
                          <td className="c tnum">{n(st?.reb)}</td>
                          <td className="c tnum">{n(st?.ast)}</td>
                          <td className="c tnum hm">{n(st?.stl)}</td>
                          <td className="c tnum hm">{n(st?.blk)}</td>
                          <td>
                            {myTurn ? (
                              <ActionForm action={pickAction.bind(null, id, p.id, draft.currentPick)} inline>
                                <SubmitButton className="pill sm solid">Draft</SubmitButton>
                              </ActionForm>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div>
              {[...board].reverse().map(({ pick, player }) => (
                <div key={pick.id} className="rrow" style={{ padding: "8px 16px" }}>
                  <b className="w-10 text-xs text-muted">#{pick.overall}</b>
                  <PlayerAvatar name={player.name} src={player.imageUrl} team={player.teamAbbr} size={36} />
                  <div className="who">
                    <div className="nm"><a>{abbrevName(player.name)}</a><span className="tm">{player.teamAbbr}</span><span className="ps">{player.position}</span></div>
                  </div>
                  <span className="text-xs text-muted">{name.get(pick.teamId)}{pick.isAuto ? " (auto)" : ""}</span>
                </div>
              ))}
              {board.length === 0 ? <div className="pad text-sm text-muted">No picks yet.</div> : null}
            </div>
          )}
        </section>

        <aside className="dr-col right">
          {cardEl ? <div className="only-d">{cardEl}</div> : null}
          <h3>Picks</h3>
          {[...board].reverse().slice(0, 30).map(({ pick, player }) => (
            <div key={pick.id} className="dr-pick">
              <PlayerAvatar name={player.name} src={player.imageUrl} team={player.teamAbbr} size={36} />
              <div className="min-w-0">
                <div className="n truncate">{player.name} / {player.teamAbbr} {player.position}</div>
                <div className="s">R{pick.round}, P{pick.overall} · {name.get(pick.teamId)}{pick.isAuto ? " (auto)" : ""}</div>
              </div>
            </div>
          ))}
          {board.length === 0 ? <div className="dr-q text-muted">No picks yet.</div> : null}
        </aside>
      </div>
    </>
  );
}
