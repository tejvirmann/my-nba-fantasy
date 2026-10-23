"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type FormState = { error?: string; message?: string };
type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function SubmitButton({ children, className = "btn btn-primary", pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}

/** A form bound to a server action that shows the action's error or message under the button. */
export function ActionForm({
  action,
  children,
  className,
  inline = false,
  id,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  inline?: boolean;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  return (
    <form id={id} action={formAction} className={className}>
      {children}
      {state.error ? <p role="alert" className={`text-sm text-lose ${inline ? "mt-1" : "mt-2"}`}>{state.error}</p> : null}
      {state.message ? <p className={`text-sm text-win ${inline ? "mt-1" : "mt-2"}`}>{state.message}</p> : null}
    </form>
  );
}
