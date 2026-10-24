import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AccentPicker } from "@/components/AccentPicker";
import { AppHeader } from "@/components/AppHeader";
import { DEFAULT_ACCENT } from "@/core/color";
import { requireUser } from "@/server/auth";
import { changePassword, logout } from "../(auth)/actions";
import { saveAccent } from "./actions";

export const metadata = { title: "Account · DS Hoops League" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <AppHeader title="Account" subtitle={`${user.displayName}${user.isAdmin ? " · Admin" : ""}`} />
      <main className="page pad stack" style={{ maxWidth: 640 }}>
        <div className="card">
          <div className="sec"><span>Appearance</span></div>
          <div className="pad stack">
            <p className="text-sm text-muted">Pick your own color for your tabs, buttons and highlights. Only you see it: it previews right away, is saved to your account and follows you to every device. Default is green.</p>
            <AccentPicker initial={user.accentColor ?? DEFAULT_ACCENT} action={saveAccent} />
          </div>
        </div>

        <div className="card">
          <div className="sec"><span>Change password</span></div>
          <ActionForm action={changePassword} className="pad stack">
            <input className="input" name="password" type="password" placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required />
            <input className="input" name="confirm" type="password" placeholder="Confirm new password" autoComplete="new-password" minLength={8} required />
            <SubmitButton className="btn btn-primary w-full">Update password</SubmitButton>
          </ActionForm>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/install" className="btn" style={{ flex: "1 1 auto" }}>Install on your phone</Link>
          {user.isAdmin ? <Link href="/admin" className="btn" style={{ flex: "1 1 auto" }}>Admin</Link> : null}
          <form action={logout} style={{ flex: "1 1 auto" }}><button className="btn w-full">Log out</button></form>
        </div>
      </main>
    </>
  );
}
