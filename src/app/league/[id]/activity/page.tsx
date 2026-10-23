import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { describeTransaction } from "@/lib/activity";
import { abbrevName } from "@/lib/names";
import { ago, leagueContext } from "@/server/page";
import { pendingClaims } from "@/server/waivers";
import { cancelClaimAction } from "../actions";

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team } = await leagueContext(id);
  const [events, teams, claims] = await Promise.all([
    db.select().from(schema.transactions).where(eq(schema.transactions.leagueId, id)).orderBy(desc(schema.transactions.createdAt)).limit(40),
    db.select().from(schema.teams).where(eq(schema.teams.leagueId, id)),
    pendingClaims(id, team?.id),
  ]);
  const name = new Map(teams.map((t) => [t.id, t.name]));
  const order = [...teams].sort((a, b) => a.waiverPriority - b.waiverPriority);

  return (
    <div className="grid2 side">
      <div>
        <div className="sec"><span>Recent activity</span></div>
        {events.map((e) => (
          <div key={e.id} className="rrow" style={{ padding: "13px 16px" }}>
            <div className="min-w-0 flex-1 text-sm">
              <b>{e.teamId ? name.get(e.teamId) : "League"}</b> <span className="text-[#555]">{describeTransaction(e.type, e.payload)}</span>
            </div>
            <span className="text-xs text-muted">{ago(e.createdAt)}</span>
          </div>
        ))}
        {events.length === 0 ? <div className="pad text-sm text-muted">Nothing yet.</div> : null}
      </div>
      <div className="pad stack">
        <div className="card">
          <div className="sec"><span>Your pending waiver claims</span></div>
          {claims.map(({ claim, player }) => (
            <div key={claim.id} className="rrow">
              <PlayerAvatar name={player.name} src={player.imageUrl} team={player.teamAbbr} size={36} />
              <div className="who">
                <div className="nm"><a>{abbrevName(player.name)}</a><span className="tm">{player.teamAbbr}</span></div>
                <div className="l3">Processes with the daily waiver run</div>
              </div>
              <ActionForm action={cancelClaimAction.bind(null, id, claim.id)} inline>
                <SubmitButton className="pill sm">Cancel</SubmitButton>
              </ActionForm>
            </div>
          ))}
          {claims.length === 0 ? <div className="pad text-sm text-muted">No pending claims.</div> : null}
        </div>
        <div className="card">
          <div className="sec"><span>Waiver order</span></div>
          {order.map((t, i) => (
            <div key={t.id} className="rrow" style={{ padding: "10px 16px" }}>
              <b style={{ width: 22 }}>{i + 1}</b>
              <span className="flex-1">{t.name}</span>
              {t.id === team?.id ? <span className="tag acc">You</span> : null}
            </div>
          ))}
          <div className="pad text-xs text-muted">Dropped players sit on waivers for 24 hours. Win a claim and you go to the back of the line.</div>
        </div>
      </div>
    </div>
  );
}
