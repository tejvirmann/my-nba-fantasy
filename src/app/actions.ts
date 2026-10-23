"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { createLeague, joinLeague, UserError } from "@/server/leagues";
import type { FormState } from "@/components/ActionForm";

export async function createLeagueAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  let id: string;
  try {
    id = await createLeague(user.id, {
      name: String(form.get("name") ?? ""),
      teamName: String(form.get("teamName") ?? ""),
      timezone: String(form.get("timezone") ?? "") || undefined,
    });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  redirect(`/league/${id}`);
}

export async function joinLeagueAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  let id: string;
  try {
    id = await joinLeague(user.id, String(form.get("code") ?? ""), String(form.get("teamName") ?? ""));
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  redirect(`/league/${id}`);
}
