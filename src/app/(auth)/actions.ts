"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string };

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await supabaseServer();
  // Usernames (no "@") map to <name>@hoops.local, which is how seeded accounts like "admin" are stored.
  const id = String(form.get("email") ?? "").trim();
  const { error } = await supabase.auth.signInWithPassword({
    email: id.includes("@") ? id : `${id.toLowerCase()}@hoops.local`,
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: "Wrong email or password." };
  redirect(safeNext(form.get("next")));
}

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Pick a display name." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? "").trim(),
    password,
    options: { data: { display_name: name }, emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Check your email to confirm your account, then log in." };
  redirect(safeNext(form.get("next")));
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== String(form.get("confirm") ?? "")) return { error: "Passwords don't match." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { message: "Password updated." };
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
