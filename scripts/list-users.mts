import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
for (const u of data?.users ?? []) console.log(u.email, "| confirmed:", !!u.email_confirmed_at, "| created:", u.created_at.slice(0, 10));
console.log("total", data?.users.length ?? 0);
