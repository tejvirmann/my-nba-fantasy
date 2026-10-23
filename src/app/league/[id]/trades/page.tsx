import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { leagueContext } from "@/server/page";
import { expireTrades, leagueTrades } from "@/server/trades";
import { teamRoster } from "@/server/roster";
import { proposeTradeAction, tradeResponse } from "../actions";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  review: "bg-sky-100 text-sky-700",
  accepted: "bg-emerald-100 text-emerald-700",
};

export default async function TradesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ with?: string }> }) {
  const { id } = await params;
  const { with: withTeam } = await searchParams;
  const { league, team, isCommissioner } = await leagueContext(id);
  await expireTrades(id);
  const teams = await db.select().from(schema.teams).where(eq(schema.teams.leagueId, id));
  const name = new Map(teams.map((t) => [t.id, t.name]));
  const trades = await leagueTrades(id);
  const live = league.status === "active" || league.status === "playoffs";
  const others = teams.filter((t) => t.id !== team?.id);
  const mineRoster = team ? await teamRoster(team.id) : [];
  const theirRoster = withTeam && others.some((t) => t.id === withTeam) ? await teamRoster(withTeam) : [];

  return (
    <div className="space-y-4">
      {live && team ? (
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Propose a trade</h2>
          <form className="flex gap-2">
            <select name="with" defaultValue={withTeam ?? ""} className="input" aria-label="Trade partner">
              <option value="">Choose a team…</option>
              {others.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
            <button className="btn btn-ghost">Load</button>
          </form>
          {theirRoster.length ? (
            <ActionForm action={proposeTradeAction.bind(null, id)} className="mt-3 space-y-3">
              <input type="hidden" name="to" value={withTeam} />
              <fieldset>
                <legend className="label mb-1">You give</legend>
                {mineRoster.map((r) => (
                  <label key={r.player.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" name="give" value={r.player.id} />{r.player.name} <span className="text-muted">{r.player.position} · {r.player.teamAbbr}</span></label>
                ))}
              </fieldset>
              <fieldset>
                <legend className="label mb-1">You get</legend>
                {theirRoster.map((r) => (
                  <label key={r.player.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" name="get" value={r.player.id} />{r.player.name} <span className="text-muted">{r.player.position} · {r.player.teamAbbr}</span></label>
                ))}
              </fieldset>
              <input name="note" className="input" placeholder="Note (optional)" maxLength={280} />
              <SubmitButton className="btn btn-primary">Send offer</SubmitButton>
            </ActionForm>
          ) : null}
        </section>
      ) : (
        <div className="card p-4 text-sm text-muted">Trades open after the draft.</div>
      )}

      <section>
        <h2 className="label mb-2">Offers</h2>
        <ul className="space-y-2">
          {trades.map(({ trade, items }) => {
            const give = items.filter((i) => i.item.fromTeamId === trade.proposerTeamId);
            const get = items.filter((i) => i.item.fromTeamId === trade.targetTeamId);
            const toMe = team?.id === trade.targetTeamId;
            const fromMe = team?.id === trade.proposerTeamId;
            return (
              <li key={trade.id} className="card p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <b>{name.get(trade.proposerTeamId)} → {name.get(trade.targetTeamId)}</b>
                  <span className={`chip ${STATUS_TONE[trade.status] ?? "bg-slate-100 text-slate-600"}`}>{trade.status}</span>
                </div>
                <div className="text-muted">Sends: {give.map((g) => g.player.name).join(", ")}</div>
                <div className="text-muted">Receives: {get.map((g) => g.player.name).join(", ")}</div>
                {trade.note ? <div className="mt-1 italic">"{trade.note}"</div> : null}
                <div className="mt-2 flex gap-2">
                  {toMe && trade.status === "pending" ? (
                    <>
                      <ActionForm action={tradeResponse.bind(null, id, trade.id, "accept")} inline><SubmitButton className="btn btn-primary btn-sm">Accept</SubmitButton></ActionForm>
                      <ActionForm action={tradeResponse.bind(null, id, trade.id, "reject")} inline><SubmitButton className="btn btn-danger btn-sm">Decline</SubmitButton></ActionForm>
                    </>
                  ) : null}
                  {fromMe && trade.status === "pending" ? (
                    <ActionForm action={tradeResponse.bind(null, id, trade.id, "cancel")} inline><SubmitButton className="btn btn-ghost btn-sm">Withdraw</SubmitButton></ActionForm>
                  ) : null}
                  {isCommissioner && trade.status === "review" ? (
                    <>
                      <ActionForm action={tradeResponse.bind(null, id, trade.id, "approve")} inline><SubmitButton className="btn btn-primary btn-sm">Approve</SubmitButton></ActionForm>
                      <ActionForm action={tradeResponse.bind(null, id, trade.id, "veto")} inline><SubmitButton className="btn btn-danger btn-sm">Veto</SubmitButton></ActionForm>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
          {trades.length === 0 ? <li className="card p-4 text-center text-sm text-muted">No trades yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
