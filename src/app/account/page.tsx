import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { requireUser } from "@/server/auth";
import { changePassword, logout } from "../(auth)/actions";

export const metadata = { title: "Account · Hoops League" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link href="/" className="text-sm text-brand-2">← Back</Link>
      <h1 className="mb-1 mt-2 text-xl font-extrabold">Account</h1>
      <p className="mb-4 text-sm text-muted">{user.displayName}{user.email && !user.email.endsWith("@hoops.local") ? ` · ${user.email}` : ""}{user.isAdmin ? " · Admin" : ""}</p>

      <ActionForm action={changePassword} className="card space-y-3 p-5">
        <h2 className="font-bold">Change password</h2>
        <input className="input" name="password" type="password" placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required />
        <input className="input" name="confirm" type="password" placeholder="Confirm new password" autoComplete="new-password" minLength={8} required />
        <SubmitButton className="btn btn-primary w-full">Update password</SubmitButton>
      </ActionForm>

      <div className="mt-4 grid gap-2">
        <Link href="/install" className="btn btn-ghost">Install on your phone</Link>
        {user.isAdmin ? <Link href="/admin" className="btn btn-ghost">Admin</Link> : null}
        <form action={logout}><button className="btn btn-ghost w-full">Log out</button></form>
      </div>
    </main>
  );
}
