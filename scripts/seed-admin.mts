// Creates (or resets) the built-in "admin" account and flags it as admin.
//   npx tsx scripts/seed-admin.mts            -> admin / password
//   ADMIN_PASSWORD=... npx tsx scripts/seed-admin.mts
// Also marks every address in ADMIN_EMAILS as admin if they already have an account.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const { db, schema } = await import("../src/db");
const { inArray } = await import("drizzle-orm");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const email = "admin@hoops.local";
const password = process.env.ADMIN_PASSWORD || "password";
const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
let user = list?.users.find((u) => u.email === email);
if (user) {
  await sb.auth.admin.updateUserById(user.id, { password, email_confirm: true });
} else {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Admin" } });
  if (error) throw error;
  user = data.user;
}
await db.insert(schema.profiles).values({ id: user!.id, displayName: "Admin", isAdmin: true }).onConflictDoUpdate({ target: schema.profiles.id, set: { isAdmin: true } });

const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const ids = (list?.users ?? []).filter((u) => allow.includes((u.email ?? "").toLowerCase())).map((u) => u.id);
if (ids.length) await db.update(schema.profiles).set({ isAdmin: true }).where(inArray(schema.profiles.id, ids));
console.log(`admin ready (login: admin). Also flagged ${ids.length} allow-listed account(s).`);
process.exit(0);
