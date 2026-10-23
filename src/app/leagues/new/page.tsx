import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/server/auth";
import { createLeagueAction } from "../../actions";

export default async function NewLeague() {
  await requireUser();
  return (
    <>
      <AppHeader title="Create a league" />
      <main className="page pad" style={{ maxWidth: 480 }}>
        <ActionForm action={createLeagueAction} className="card pad stack">
          <input className="input" name="name" placeholder="League name" required maxLength={60} />
          <input className="input" name="teamName" placeholder="Your team name" required maxLength={40} />
          <select className="input" name="timezone" defaultValue="America/New_York" aria-label="Time zone">
            <option value="America/New_York">Eastern</option>
            <option value="America/Chicago">Central</option>
            <option value="America/Denver">Mountain</option>
            <option value="America/Los_Angeles">Pacific</option>
          </select>
          <p className="text-xs text-muted">Weeks run Monday to Sunday in this time zone. You can change scoring and rules before the draft.</p>
          <SubmitButton className="btn btn-primary w-full">Create league</SubmitButton>
        </ActionForm>
      </main>
    </>
  );
}
