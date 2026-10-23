import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Countdown } from "@/components/Countdown";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { pickInfo } from "@/core/draft";
import { autoPickExpired, draftBoard, getDraft } from "@/server/draft";
import { fmt1, leagueContext } from "@/server/page";
import { playerPool } from "@/server/roster";
import { draftAdmin, pickAction } from "../actions";

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      <div className="space-y-4">
        <div className="card p-5">
          <h2 className="font-bold">Draft not set up</h2>
          <p className="mt-1 text-sm text-muted">{teams.length} team{teams.length === 1 ? "" : "s"} have joined. Invite code <b className="tracking-widest">{league.inviteCode}</b>.</p>
          {isCommissioner ? (
            <ActionForm action={draftAdmin.bind(null, id, "create")} className="mt-3">
              <SubmitButton className="btn btn-primary">Randomize draft order</SubmitButton>
            </ActionForm>
          ) : (
            <p className="mt-2 text-sm text-muted">The commissioner will set the draft order.</p>
          )}
        </div>
      </div>
    );
  }

  const board = await draftBoard(draft.id);
  const live = draft.status === "live" || draft.status === "paused";
  const done = draft.status === "done";
  const onClock = live && draft.currentPick <= draft.order.length * draft.rounds ? pickInfo(draft.order, draft.currentPick) : null;
  const myTurn = !!team && onClock?.teamId === team.id && draft.status === "live";
  const pickedIds = board.map((b) => b.player.id);
  const pool = live ? await playerPool(league, { limit: 40, excludeIds: pickedIds }) : [];

  return (
    <div className="space-y-4">
      {live ? <AutoRefresh seconds={4} /> : null}

      <section className="card overflow-hidden">
        <div className="bg-brand px-4 py-3 text-white">
          <div className="text-xs text-white/70">
            {draft.status === "pending" && "Draft order set"}
            {draft.status === "paused" && "Draft paused"}
            {draft.status === "live" && `Round ${onClock?.round} · Pick ${draft.currentPick}`}
            {done && "Draft complete"}
          </div>
          <div className="flex items-end justify-between">
            <div className="text-lg font-extrabold">{onClock ? `${name.get(onClock.teamId)} on the clock` : done ? "Good luck this season" : "Waiting to start"}</div>
            {draft.status === "live" ? (
              <div className="text-3xl font-extrabold tabular-nums"><Countdown deadline={draft.deadline?.toISOString() ?? null} /></div>
            ) : null}
          </div>
          {myTurn ? <div className="mt-1 text-sm font-bold text-accent">It's your pick!</div> : null}
        </div>
        <ol className="flex gap-2 overflow-x-auto px-3 py-2 text-xs">
          {draft.order.map((tid, i) => (
            <li key={tid} className={`shrink-0 rounded-full border px-2 py-1 ${onClock?.teamId === tid ? "border-accent bg-orange-50 font-bold" : "border-line"}`}>
              {i + 1}. {name.get(tid)}
            </li>
          ))}
        </ol>
      </section>

      {isCommissioner ? (
        <section className="card flex flex-wrap gap-2 p-3">
          {draft.status === "pending" ? (
            <>
              <ActionForm action={draftAdmin.bind(null, id, "start")} inline><SubmitButton className="btn btn-accent btn-sm">Start draft</SubmitButton></ActionForm>
              <ActionForm action={draftAdmin.bind(null, id, "create")} inline><SubmitButton className="btn btn-ghost btn-sm">Re-randomize</SubmitButton></ActionForm>
            </>
          ) : null}
          {draft.status === "live" ? (
            <>
              <ActionForm action={draftAdmin.bind(null, id, "pause")} inline><SubmitButton className="btn btn-ghost btn-sm">Pause</SubmitButton></ActionForm>
              <ActionForm action={draftAdmin.bind(null, id, "autopick")} inline><SubmitButton className="btn btn-ghost btn-sm">Auto-pick now</SubmitButton></ActionForm>
            </>
          ) : null}
          {draft.status === "paused" ? (
            <ActionForm action={draftAdmin.bind(null, id, "resume")} inline><SubmitButton className="btn btn-accent btn-sm">Resume</SubmitButton></ActionForm>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      {live ? (
        <section>
          <h2 className="label mb-2">Best available</h2>
          <ul className="card divide-y divide-line">
            {pool.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <PlayerAvatar name={p.name} src={p.imageUrl} team={p.teamAbbr} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted">{p.position} · {p.teamAbbr} · {p.gp ? `${fmt1(p.avg)} avg` : "no stats"}</div>
                </div>
                {myTurn ? (
                  <ActionForm action={pickAction.bind(null, id, p.id, draft.currentPick)} inline>
                    <SubmitButton className="btn btn-accent btn-sm">Draft</SubmitButton>
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={live ? "" : "lg:col-span-2"}>
        <h2 className="label mb-2">Picks ({board.length})</h2>
        <ul className="card divide-y divide-line">
          {[...board].reverse().map(({ pick, player }) => (
            <li key={pick.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-8 text-xs font-bold text-muted">#{pick.overall}</span>
              <PlayerAvatar name={player.name} src={player.imageUrl} team={player.teamAbbr} size={28} />
              <span className="min-w-0 flex-1 truncate"><b>{player.name}</b> <span className="text-muted">{player.position} · {player.teamAbbr}</span></span>
              <span className="shrink-0 text-xs text-muted">{name.get(pick.teamId)}{pick.isAuto ? " (auto)" : ""}</span>
            </li>
          ))}
          {board.length === 0 ? <li className="px-3 py-4 text-center text-sm text-muted">No picks yet.</li> : null}
        </ul>
      </section>
      </div>
    </div>
  );
}
