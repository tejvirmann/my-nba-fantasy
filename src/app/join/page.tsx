import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { requireUser } from "@/server/auth";
import { joinLeagueAction } from "../actions";

export default async function Join({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await requireUser();
  const { code } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link href="/" className="text-sm text-brand-2">← Back</Link>
      <h1 className="mb-4 mt-2 text-xl font-extrabold">Join a league</h1>
      <ActionForm action={joinLeagueAction} className="card space-y-3 p-5">
        <input className="input uppercase tracking-widest" name="code" placeholder="Invite code" defaultValue={code ?? ""} required maxLength={6} />
        <input className="input" name="teamName" placeholder="Your team name" required maxLength={40} />
        <SubmitButton className="btn btn-primary w-full">Join</SubmitButton>
      </ActionForm>
    </main>
  );
}
