import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/server/auth";
import { joinLeagueAction } from "../actions";

export default async function Join({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await requireUser();
  const { code } = await searchParams;
  return (
    <>
      <AppHeader title="Join a league" />
      <main className="page pad" style={{ maxWidth: 480 }}>
        <ActionForm action={joinLeagueAction} className="card pad stack">
          <input className="input uppercase tracking-widest" name="code" placeholder="Invite code" defaultValue={code ?? ""} required maxLength={6} />
          <input className="input" name="teamName" placeholder="Your team name" required maxLength={40} />
          <SubmitButton className="btn btn-primary w-full">Join</SubmitButton>
        </ActionForm>
      </main>
    </>
  );
}
