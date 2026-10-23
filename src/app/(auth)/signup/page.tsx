import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { signup } from "../actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <ActionForm action={signup} className="space-y-3">
      <h2 className="text-lg font-bold">Create your account</h2>
      <input type="hidden" name="next" value={next ?? "/"} />
      <input className="input" name="name" placeholder="Display name" autoComplete="nickname" required />
      <input className="input" name="email" type="email" placeholder="Email" autoComplete="email" required />
      <input className="input" name="password" type="password" placeholder="Password (8+ characters)" autoComplete="new-password" minLength={8} required />
      <SubmitButton className="btn btn-primary w-full">Sign up</SubmitButton>
      <p className="text-center text-sm">
        Have an account? <Link href="/login" className="text-brand-2 underline">Log in</Link>
      </p>
    </ActionForm>
  );
}
