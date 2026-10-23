import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { requireUser } from "@/server/auth";
import { createLeagueAction } from "../../actions";

export default async function NewLeague() {
  await requireUser();
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link href="/" className="text-sm text-brand-2">← Back</Link>
      <h1 className="mb-4 mt-2 text-xl font-extrabold">Create a league</h1>
      <ActionForm action={createLeagueAction} className="card space-y-3 p-5">
        <input className="input" name="name" placeholder="League name" required maxLength={60} />
        <input className="input" name="teamName" placeholder="Your team name" required maxLength={40} />
        <select className="input" name="timezone" defaultValue="America/New_York">
          <option value="America/New_York">Eastern</option>
          <option value="America/Chicago">Central</option>
          <option value="America/Denver">Mountain</option>
          <option value="America/Los_Angeles">Pacific</option>
        </select>
        <p className="text-xs text-muted">Weeks run Monday to Sunday in this timezone. You can change scoring and rules before the draft.</p>
        <SubmitButton className="btn btn-primary w-full">Create league</SubmitButton>
      </ActionForm>
    </main>
  );
}
