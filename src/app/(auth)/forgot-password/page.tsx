import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Forgot your password?</h2>
      <p className="text-sm">Reach out to Tejvir.</p>
      <p className="text-sm text-muted">
        He didn&apos;t add a password reset because everyone here is intelligent and makes no mistakes, ever.
      </p>
      <Link href="/login" className="btn btn-primary w-full">Back to log in</Link>
    </div>
  );
}
