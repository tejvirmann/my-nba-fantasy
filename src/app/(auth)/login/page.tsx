import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { login } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <ActionForm action={login} className="space-y-3">
      <h2 className="text-lg font-bold">Log in</h2>
      {error === "link" ? <p className="text-sm text-lose">That link expired. Request a new one.</p> : null}
      <input type="hidden" name="next" value={next ?? "/"} />
      <input className="input" name="email" type="text" placeholder="Email or username" autoComplete="username" autoCapitalize="none" required />
      <input className="input" name="password" type="password" placeholder="Password" autoComplete="current-password" required />
      <SubmitButton className="btn btn-primary w-full">Log in</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-link underline">Forgot password?</Link>
        <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-link underline">Create account</Link>
      </div>
    </ActionForm>
  );
}
