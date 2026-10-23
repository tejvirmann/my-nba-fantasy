// Screenshots of the running app (default http://localhost:3111) as the "admin" account into an output folder.
//   npx tsx scripts/screenshots.mts mockups/current
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";

config({ path: ".env.local" });
const BASE = process.env.BASE ?? "http://localhost:3111";
const OUT = process.argv[2] ?? "mockups/current";
mkdirSync(OUT, { recursive: true });
const { db, schema } = await import("../src/db");
const { eq } = await import("drizzle-orm");

const [lg] = await db.select().from(schema.leagues).where(eq(schema.leagues.name, "Demo League"));
if (!lg) throw new Error("Run scripts/seed-demo.mts first");
const L = `/league/${lg.id}`;

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ref = new URL(URL_).hostname.split(".")[0];
const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const { data, error } = await anon.auth.signInWithPassword({ email: "admin@hoops.local", password: process.env.ADMIN_PASSWORD || "password" });
if (error) throw error;
const raw = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const chunks = raw.match(/.{1,3000}/g)!;
const cookies = chunks.map((value, i) => ({ name: `sb-${ref}-auth-token${chunks.length > 1 ? `.${i}` : ""}`, value, domain: "localhost", path: "/" }));

const pages: [string, string, boolean][] = [
  ["login", "/login", false],
  ["home", "/", true],
  ["matchup", L, true],
  ["roster", `${L}/team`, true],
  ["players", `${L}/players`, true],
  ["activity", `${L}/activity`, true],
  ["draft", `${L}/draft`, true],
  ["trades", `${L}/trades`, true],
  ["standings", `${L}/standings`, true],
  ["league-settings", `${L}/settings`, true],
  ["admin", "/admin", true],
  ["account", "/account", true],
  ["install", "/install", false],
];
const views = [
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: "desktop", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
];

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
for (const v of views) {
  const { name, ...opts } = v;
  for (const authed of [false, true]) {
    const ctx = await browser.newContext(opts);
    if (authed) await ctx.addCookies(cookies);
    const page = await ctx.newPage();
    for (const [label, path, needsAuth] of pages) {
      if (needsAuth !== authed) continue;
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60_000 });
      await page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true });
      console.log("shot", `${label}-${name}`);
    }
    await ctx.close();
  }
}
await browser.close();
process.exit(0);
