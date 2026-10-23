import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { rosterLimit } from "@/core/roster";
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
    <div className="space-y-4">
      <form className="flex gap-2" role="search">
        <input name="q" defaultValue={q ?? ""} placeholder="Search players or team" className="input" aria-label="Search players" />
        <select name="pos" defaultValue={pos ?? ""} className="input !w-28" aria-label="Position">
          <option value="">All</option>
          <option value="G">G</option>
          <option value="F">F</option>
          <option value="C">C</option>
        </select>
        <button className="btn btn-primary">Go</button>
      </form>

      {claims.length ? (
        <section>
          <h2 className="label mb-2">Your pending claims</h2>
          <ul className="card divide-y divide-line">
            {claims.map(({ claim, player }) => (
              <li key={claim.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-semibold">{player.name}</span>
                <ActionForm action={cancelClaimAction.bind(null, id, claim.id)} inline>
                  <SubmitButton className="btn btn-ghost btn-sm">Cancel</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="label mb-2">Available players {full ? "· roster full, pick a drop" : ""}</h2>
        <ul className="card divide-y divide-line">
          {pool.map((p) => (
            <li key={p.id} className="px-3 py-2">
              <div className="flex items-center gap-3">
                <PlayerAvatar name={p.name} src={p.imageUrl} team={p.teamAbbr} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold leading-tight">{p.name}</div>
                  <div className="truncate text-xs text-muted">
                    {p.position} · {p.teamAbbr}
                    {p.injuryStatus ? <span className="ml-1 font-semibold text-lose">{p.injuryStatus}</span> : null}
                    {p.onWaivers ? <span className="chip ml-1 bg-amber-100 text-amber-700">Waivers</span> : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">{p.gp ? fmt1(p.avg) : "–"}</div>
                  <div className="text-[11px] text-muted">avg · {p.gp} gp</div>
                </div>
              </div>
              {live && team ? (
                <ActionForm
                  action={(p.onWaivers ? claimAction : addPlayerAction).bind(null, id, p.id)}
                  className="mt-2 flex items-center gap-2"
                  inline
                >
                  {full || p.onWaivers ? (
                    <select name="drop" className="input !w-auto !py-1 text-xs" required={full} aria-label="Player to drop">
                      <option value="">{full ? "Drop…" : "No drop"}</option>
                      {roster.map((r) => (
                        <option key={r.player.id} value={r.player.id}>{r.player.name}</option>
                      ))}
                    </select>
                  ) : null}
                  <SubmitButton className="btn btn-primary btn-sm">{p.onWaivers ? "Claim" : "Add"}</SubmitButton>
                </ActionForm>
              ) : null}
            </li>
          ))}
          {pool.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted">No players match.</li> : null}
        </ul>
      </section>
      {!live ? <p className="text-center text-xs text-muted">Adds open after the draft. <Link className="underline" href={`/league/${id}/draft`}>Draft room</Link></p> : null}
    </div>
  );
}
