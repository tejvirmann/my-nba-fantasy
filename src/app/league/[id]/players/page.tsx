import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { rosterLimit } from "@/core/roster";
import { abbrevName } from "@/lib/names";
import { fmt1, leagueContext } from "@/server/page";
import { playerPool, teamRoster } from "@/server/roster";
import { pendingClaims } from "@/server/waivers";
import { addPlayerAction, cancelClaimAction, claimAction } from "../actions";

export default async function PlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; pos?: string }>;
}) {
  const { id } = await params;
  const { q, pos } = await searchParams;
  const { league, team } = await leagueContext(id);
  const live = league.status === "active" || league.status === "playoffs";
  const [pool, roster, claims] = await Promise.all([
    playerPool(league, { q, position: pos, limit: 50 }),
    team ? teamRoster(team.id) : Promise.resolve([]),
    pendingClaims(id, team?.id),
  ]);
  const full = roster.length >= rosterLimit(league.settings);

  return (
    <>
      <form className="toolbar" role="search" style={{ alignItems: "center" }}>
        <select name="pos" defaultValue={pos ?? ""} className="pill" style={{ color: "var(--link)", borderColor: "var(--link)" }} aria-label="Position">
          <option value="">All Pos.</option>
          <option value="G">G</option>
          <option value="F">F</option>
          <option value="C">C</option>
        </select>
        <input name="q" defaultValue={q ?? ""} placeholder="Player name or team" className="input min-w-0 flex-1" style={{ maxWidth: 360 }} aria-label="Search players" />
        <button className="btn btn-primary">Search</button>
      </form>

      {claims.length ? (
        <>
          <div className="sec"><span>Your pending claims</span></div>
          {claims.map(({ claim, player }) => (
            <div key={claim.id} className="rrow" style={{ padding: "10px 16px" }}>
              <span className="flex-1 font-semibold">{player.name}</span>
              <ActionForm action={cancelClaimAction.bind(null, id, claim.id)} inline>
                <SubmitButton className="pill sm">Cancel</SubmitButton>
              </ActionForm>
            </div>
          ))}
        </>
      ) : null}

      <div className="sec">
        <span>Available players{full ? " · roster full, pick a drop" : ""}</span>
        <div className="cols"><span>GP</span><span>AVG</span><span style={{ width: 76 }} /></div>
      </div>
      {pool.map((p) => (
        <div key={p.id} className="rrow">
          <span className="slot" style={{ width: 56 }}>{p.position ?? "–"}</span>
          <PlayerAvatar name={p.name} src={p.imageUrl} team={p.teamAbbr} size={52} />
          <div className="who">
            <div className="nm">
              <a>{abbrevName(p.name)}</a>
              <span className="tm">{p.teamAbbr}</span>
              {p.injuryStatus ? <span className="inj">{p.injuryStatus}</span> : null}
              {p.onWaivers ? <span className="tag warn">Waivers</span> : null}
            </div>
            <div className="l2">Avg {p.gp ? fmt1(p.avg) : "–"} FPTS | {p.gp} GP</div>
          </div>
          <div className="rstats"><span>{p.gp}</span><span>{p.gp ? fmt1(p.avg) : "–"}</span></div>
          <div className="rpts" style={{ minWidth: 76 }}>
            {live && team ? (
              <ActionForm action={(p.onWaivers ? claimAction : addPlayerAction).bind(null, id, p.id)} inline>
                {full || p.onWaivers ? (
                  <select name="drop" className="input !mb-1 !py-1 text-xs" required={full} aria-label="Player to drop">
                    <option value="">{full ? "Drop…" : "No drop"}</option>
                    {roster.map((r) => (<option key={r.player.id} value={r.player.id}>{r.player.name}</option>))}
                  </select>
                ) : null}
                <SubmitButton className={`pill sm ${p.onWaivers ? "" : "solid"}`}>{p.onWaivers ? "Claim" : "Add"}</SubmitButton>
              </ActionForm>
            ) : null}
          </div>
        </div>
      ))}
      {pool.length === 0 ? <div className="pad text-center text-sm text-muted">No players match.</div> : null}
      {!live ? <p className="pad text-center text-xs text-muted">Adds open after the draft. <Link className="underline" href={`/league/${id}/draft`}>Draft room</Link></p> : null}
    </>
  );
}
