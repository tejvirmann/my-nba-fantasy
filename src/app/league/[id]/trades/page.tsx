import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { leagueContext } from "@/server/page";
import { expireTrades, leagueTrades } from "@/server/trades";
import { teamRoster } from "@/server/roster";
import { proposeTradeAction, tradeResponse } from "../actions";

const TONE: Record<string, string> = { pending: "warn", review: "acc", accepted: "good", vetoed: "bad", rejected: "bad", invalid: "bad" };

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
    <div className="grid2 even">
      <div>
        <div className="sec"><span>Offers</span></div>
        {trades.map(({ trade, items }) => {
          const give = items.filter((i) => i.item.fromTeamId === trade.proposerTeamId);
          const get = items.filter((i) => i.item.fromTeamId === trade.targetTeamId);
          const toMe = team?.id === trade.targetTeamId;
          const fromMe = team?.id === trade.proposerTeamId;
          return (
            <div key={trade.id} className="pad stack" style={{ borderBottom: "1px solid #eee" }}>
              <div className="row between">
                <b>{name.get(trade.proposerTeamId)} → {name.get(trade.targetTeamId)}</b>
                <span className={`tag ${TONE[trade.status] ?? ""}`}>{trade.status}</span>
              </div>
              <div className="text-sm text-muted">Sends: {give.map((g) => g.player.name).join(", ")}</div>
              <div className="text-sm text-muted">Receives: {get.map((g) => g.player.name).join(", ")}</div>
              {trade.note ? <div className="text-sm italic">&ldquo;{trade.note}&rdquo;</div> : null}
              <div className="flex gap-2">
                {toMe && trade.status === "pending" ? (
                  <>
                    <ActionForm action={tradeResponse.bind(null, id, trade.id, "accept")} inline><SubmitButton className="pill solid sm">Accept</SubmitButton></ActionForm>
                    <ActionForm action={tradeResponse.bind(null, id, trade.id, "reject")} inline><SubmitButton className="pill danger sm">Decline</SubmitButton></ActionForm>
                  </>
                ) : null}
                {fromMe && trade.status === "pending" ? (
                  <ActionForm action={tradeResponse.bind(null, id, trade.id, "cancel")} inline><SubmitButton className="pill sm">Withdraw</SubmitButton></ActionForm>
                ) : null}
                {isCommissioner && trade.status === "review" ? (
                  <>
                    <ActionForm action={tradeResponse.bind(null, id, trade.id, "approve")} inline><SubmitButton className="pill solid sm">Approve</SubmitButton></ActionForm>
                    <ActionForm action={tradeResponse.bind(null, id, trade.id, "veto")} inline><SubmitButton className="pill danger sm">Veto</SubmitButton></ActionForm>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
        {trades.length === 0 ? <div className="pad text-sm text-muted">No trades yet.</div> : null}
      </div>

      <div>
        <div className="sec"><span>Propose a trade</span></div>
        {live && team ? (
          <div className="pad stack">
            <form className="flex gap-2">
              <select name="with" defaultValue={withTeam ?? ""} className="input" aria-label="Trade partner">
                <option value="">Choose a team…</option>
                {others.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
              <button className="btn">Load</button>
            </form>
            {theirRoster.length ? (
              <ActionForm action={proposeTradeAction.bind(null, id)} className="stack">
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
          </div>
        ) : (
          <div className="pad text-sm text-muted">Trades open after the draft.</div>
        )}
      </div>
    </div>
  );
}
