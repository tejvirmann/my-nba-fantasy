import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { supabaseServer } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string; displayName: string; isAdmin: boolean; accentColor: string | null };

/** Emails that are always admins (comma-separated env var). Only trusted because signups are closed to that address once taken. */
function adminEmails(): Set<string> {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
}

/**
 * The signed-in user (or null), creating their profile row on first sight.
 * Memoized per request, so the root layout and pages can both call it for free.
 * Identity comes from the middleware-verified headers; if they are absent we verify with Supabase directly.
 */
export const getUserOrNull = cache(async (): Promise<SessionUser | null> => {
  const h = await headers();
  let id = h.get("x-uid");
  let email = h.get("x-email") ?? "";
  let metaName = decodeURIComponent(h.get("x-name") ?? "");
  if (!id) {
    if (h.get("x-auth")) return null; // middleware ran and found no session
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    id = data.user.id;
    email = data.user.email ?? "";
    metaName = (data.user.user_metadata?.display_name as string | undefined) ?? "";
  }

  let [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, id));
  if (!profile) {
    const name = metaName || email.split("@")[0] || "Player";
    [profile] = await db.insert(schema.profiles).values({ id, displayName: name }).onConflictDoNothing().returning();
    if (!profile) [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, id));
  }
  if (!profile.isAdmin && email && adminEmails().has(email.toLowerCase())) {
    await db.update(schema.profiles).set({ isAdmin: true }).where(eq(schema.profiles.id, id));
    profile = { ...profile, isAdmin: true };
  }
  return { id, email, displayName: profile.displayName, isAdmin: profile.isAdmin, accentColor: profile.accentColor };
});

/** The signed-in user, or a redirect to /login. Memoized per request (shares getUserOrNull's lookup). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUserOrNull();
  if (!user) redirect("/login");
  return user;
}

/** 404 (not 403) for non-admins so the admin area isn't discoverable. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) notFound();
  return user;
}
