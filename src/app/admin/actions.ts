"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { UserError } from "@/server/leagues";
import { adminSync, setLeagueFormat, setUserAdmin } from "@/server/admin";

type State = { error?: string; message?: string };

async function run(fn: () => Promise<string | void>): Promise<State> {
  try {
    const message = await fn();
    revalidatePath("/admin");
    revalidatePath("/league", "layout");
    return message ? { message } : {};
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong." };
  }
}

export async function toggleFormat(leagueId: string, formatId: string, enabled: boolean, _: State, __: FormData): Promise<State> {
  return run(async () => {
    const admin = await requireAdmin();
    await setLeagueFormat(admin.id, leagueId, formatId, enabled);
  });
}

export async function toggleAdmin(userId: string, makeAdmin: boolean, _: State, __: FormData): Promise<State> {
  return run(async () => {
    const admin = await requireAdmin();
    await setUserAdmin(admin.id, userId, makeAdmin);
  });
}

export async function forceSync(_: State, __: FormData): Promise<State> {
  return run(async () => {
    const admin = await requireAdmin();
    const r = await adminSync(admin.id);
    return `Synced ${r.games} games, ${r.lines} stat lines, ${r.players} players.`;
  });
}
