import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { TeamLogo } from "@/components/TeamLogo";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import type { ScoringWeights } from "@/core/types";
import { leagueContext } from "@/server/page";
import { processWaiversAction, updateSettings } from "../actions";

const WEIGHT_LABELS: [keyof ScoringWeights, string][] = [
  ["pts", "Point"], ["reb", "Rebound"], ["ast", "Assist"], ["stl", "Steal"], ["blk", "Block"], ["tov", "Turnover"],
  ["tpm", "3-pointer made"], ["fgm", "FG made"], ["fga", "FG attempted"], ["ftm", "FT made"], ["fta", "FT attempted"],
  ["doubleDouble", "Double-double bonus"], ["tripleDouble", "Triple-double bonus"],
];

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league, isCommissioner } = await leagueContext(id);
  const teams = await db.select().from(schema.teams).where(eq(schema.teams.leagueId, id));
  const s = league.settings;
  const setup = league.status === "setup";

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start lg:gap-6">
      <section className="card">
        <div className="sec"><span>Invite friends</span></div>
        <div className="pad">
        <div className="label">Invite code</div>
        <div className="text-2xl font-extrabold tracking-[0.3em] text-link">{league.inviteCode}</div>
        <ul className="mt-3 divide-y divide-line text-sm">
          {teams.map((t) => (<li key={t.id} className="row py-1.5" style={{ gap: 10 }}><TeamLogo team={t} size={28} />{t.name}{t.ownerId === league.commissionerId ? <span className="tag ml-2">Commissioner</span> : null}</li>))}
        </ul>
        </div>
      </section>

      <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
      {isCommissioner ? (
        <ActionForm action={updateSettings.bind(null, id)} className="card">
          <div className="sec"><span>Commissioner settings</span></div>
          <div className="pad space-y-4">
          <label className="block"><span className="label">League name</span><input className="input mt-1" name="name" defaultValue={league.name} /></label>

          <label className="block">
            <span className="label">Lock-In mode</span>
            <select className="input mt-1" name="lockMode" defaultValue={s.lockMode}>
              <option value="strict">Strict (Sleeper): lock before the player's next game</option>
              <option value="open">Open: every finished game stays selectable until week end</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Trade approval</span>
            <select className="input mt-1" name="tradeReview" defaultValue={s.tradeReview}>
              <option value="none">Instant when accepted</option>
              <option value="commissioner">Commissioner approves</option>
            </select>
          </label>

          {setup ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="label">Week 1 starts (Monday)</span><input className="input mt-1" type="date" name="week1Start" defaultValue={league.week1Start} /></label>
                <label className="block"><span className="label">Regular season weeks</span><input className="input mt-1" type="number" name="regularWeeks" defaultValue={league.regularWeeks} min={1} max={30} /></label>
                <label className="block"><span className="label">Playoff teams</span><input className="input mt-1" type="number" name="playoffTeams" defaultValue={league.playoffTeams} min={2} max={8} /></label>
                <label className="block"><span className="label">Bench spots</span><input className="input mt-1" type="number" name="benchSize" defaultValue={s.benchSize} min={0} max={8} /></label>
                <label className="block"><span className="label">Pick timer (sec)</span><input className="input mt-1" type="number" name="pickSeconds" defaultValue={s.pickSeconds} min={15} max={600} /></label>
              </div>
              <fieldset>
                <legend className="label mb-2">Scoring (points per stat)</legend>
                <div className="grid grid-cols-2 gap-2">
                  {WEIGHT_LABELS.map(([k, label]) => (
                    <label key={k} className="flex items-center justify-between gap-2 text-sm">{label}
                      <input className="input !w-20 !py-1" type="number" step="0.1" name={`w_${k}`} defaultValue={s.scoring[k]} />
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <p className="text-xs text-muted">Scoring, schedule and roster size are locked once the draft starts.</p>
          )}
          <SubmitButton className="btn btn-primary w-full">Save settings</SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <section className="card">
          <div className="sec"><span>League rules</span></div>
          <div className="pad text-sm">
          <p>Lock-In mode: <b>{s.lockMode === "strict" ? "Strict" : "Open"}</b></p>
          <p>Starters: {s.starterSlots.join(", ")} · Bench: {s.benchSize}</p>
          <p>Regular season: {league.regularWeeks} weeks · Playoffs: top {league.playoffTeams}</p>
          </div>
        </section>
      )}

      </div>
      {isCommissioner && !setup ? (
        <ActionForm action={processWaiversAction.bind(null, id)} className="card lg:col-start-1">
          <div className="sec"><span>Waivers</span></div>
          <div className="pad">
          <p className="mb-2 text-xs text-muted">Claims are also processed automatically every day.</p>
          <SubmitButton className="btn">Process waivers now</SubmitButton>
          </div>
        </ActionForm>
      ) : null}
    </div>
  );
}
