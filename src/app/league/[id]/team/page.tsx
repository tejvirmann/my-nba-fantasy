import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RefreshBar } from "@/components/RefreshBar";
import { computeWeek, currentWeek, type PlayerWeekView } from "@/server/engine";
import { orderLineup, sourceLabel } from "@/server/lineup";
import { fmt1, gameTime, leagueContext } from "@/server/page";
import { dropPlayerAction, lockAction, renameTeam, saveAutoLock, saveLineup } from "../actions";
import { SLOT_BENCH } from "@/core/types";

export default async function MyTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league, team } = await leagueContext(id);
  if (!team) return <div className="card p-5 text-muted">The commissioner doesn't have a team in this league.</div>;
  const s = league.settings;
  const week = Math.max(1, currentWeek(league));
  const live = league.status === "active" || league.status === "playoffs";

  if (!live) {
    return <div className="card p-5 text-muted">Your roster appears here once the draft is done.</div>;
  }

  const view = await computeWeek(id, week, new Date(), league);
  const tv = view.teams.find((t) => t.team.id === team.id)!;
  const { starters, bench, departed } = orderLineup(tv.players, s.starterSlots);
  const slotOptions = [...new Set(s.starterSlots), SLOT_BENCH];

  const row = (p: PlayerWeekView) => (
    <li key={p.playerId} className="px-3 py-3">
      <div className="flex items-center gap-3">
        <PlayerAvatar name={p.name} src={p.imageUrl} team={p.teamAbbr} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-tight">{p.name}</div>
          <div className="truncate text-xs text-muted">
            {p.position} · {p.teamAbbr}
            {p.injuryStatus ? <span className="ml-1 font-semibold text-lose">{p.injuryStatus}</span> : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold tabular-nums">{fmt1(p.counted)}</div>
          <div className="text-[11px] text-muted">{sourceLabel(p)}</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {p.onRoster ? (
          <select
            name={`slot_${p.playerId}`}
            form="lineup"
            defaultValue={p.slot}
            disabled={!!p.lock}
            className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold"
            aria-label={`Slot for ${p.name}`}
          >
            {slotOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        ) : (
          <span className="chip bg-slate-100 text-slate-600">No longer on team</span>
        )}
        {p.games.length === 0 ? <span className="text-xs text-muted">No games this week</span> : null}
        {p.games.map((g) => {
          const counted = p.resolution.counted?.gameId === g.gameId;
          const lockable = p.resolution.lockableGameIds.includes(g.gameId) && p.isStarter;
          const base = "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs";
          const tone = counted ? "border-emerald-500 bg-emerald-50 font-bold text-emerald-800" : "border-line bg-white text-slate-600";
          if (g.status !== "final") {
            return (
              <span key={g.gameId} className={`${base} border-dashed border-line text-muted`}>
                {g.label} · {g.status === "live" ? "Live" : gameTime(g.start, league.timezone)}
              </span>
            );
          }
          if (!g.played) return <span key={g.gameId} className={`${base} border-line text-muted line-through`}>{g.label} · DNP</span>;
          return (
            <span key={g.gameId} className="inline-flex items-center gap-1">
              <span className={`${base} ${tone}`}>
                {g.label} · {fmt1(g.points)}
                {g.line ? <span className="font-normal text-muted"> ({g.line.pts}p {g.line.reb}r {g.line.ast}a)</span> : null}
              </span>
              {lockable ? (
                <ActionForm action={lockAction.bind(null, id, p.playerId, g.gameId)} inline>
                  <SubmitButton className="btn btn-accent btn-sm" pendingText="…">Lock</SubmitButton>
                </ActionForm>
              ) : null}
            </span>
          );
        })}
      </div>
      {!p.isStarter && p.onRoster && p.games.some((g) => g.status === "final" && g.played) ? (
        <p className="mt-1 text-[11px] text-muted">Bench players can't be locked or scored.</p>
      ) : null}
      {p.onRoster && !p.lock ? (
        <ActionForm action={dropPlayerAction.bind(null, id, p.playerId)} inline className="mt-1">
          <SubmitButton className="text-[11px] text-muted underline" pendingText="…">Drop</SubmitButton>
        </ActionForm>
      ) : null}
    </li>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="min-w-0 space-y-4">
      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="label">Week {week} total</div>
            <div className="text-3xl font-extrabold tabular-nums text-brand">{fmt1(tv.total)}</div>
          </div>
          <div className="max-w-[55%] text-right text-xs text-muted">
            {s.lockMode === "strict"
              ? "Strict Lock-In: lock a finished game before that player's next game starts. If you don't, their last game of the week counts."
              : "Open Lock-In: every finished game stays available all week. With auto-pick on, the highest game counts."}
          </div>
        </div>
      </section>

      <section>
        <h2 className="label mb-2">Starters</h2>
        <ul className="card divide-y divide-line">
          {starters.map(({ slot, player }, i) =>
            player ? (
              row(player)
            ) : (
              <li key={i} className="px-3 py-3 text-sm text-muted">{slot} · empty slot</li>
            ),
          )}
        </ul>
      </section>

      <section>
        <h2 className="label mb-2">Bench</h2>
        <ul className="card divide-y divide-line">
          {bench.length ? bench.map(row) : <li className="px-3 py-3 text-sm text-muted">Bench is empty.</li>}
        </ul>
      </section>

      {departed.length ? (
        <section>
          <h2 className="label mb-2">Locked, then left your team</h2>
          <ul className="card divide-y divide-line">{departed.map(row)}</ul>
        </section>
      ) : null}

      <ActionForm id="lineup" action={saveLineup.bind(null, id)} className="sticky bottom-16 z-10 lg:static">
        <SubmitButton className="btn btn-primary w-full shadow-lg">Save lineup</SubmitButton>
      </ActionForm>

      </div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
      <section className="card p-4">
        <ActionForm action={saveAutoLock.bind(null, id)} className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="enabled" defaultChecked={team.autoLock} className="h-4 w-4" />
            Auto-pick for me
          </label>
          <p className="text-xs text-muted">
            {s.lockMode === "open"
              ? "Counts each player's highest game at week's end."
              : "Auto-locks the first finished game scoring at or above the threshold. Otherwise the last game counts."}
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
          <SubmitButton className="btn btn-ghost btn-sm">Save</SubmitButton>
        </ActionForm>
      </section>

      <ActionForm action={renameTeam.bind(null, id)} className="card flex items-center gap-2 p-3">
        <input name="name" defaultValue={team.name} className="input !py-1.5" maxLength={40} aria-label="Team name" />
        <SubmitButton className="btn btn-ghost btn-sm">Rename</SubmitButton>
      </ActionForm>

      <RefreshBar leagueId={id} />
      <Link href={`/league/${id}/players`} className="btn btn-ghost w-full">Find players</Link>
      </aside>
    </div>
  );
}
