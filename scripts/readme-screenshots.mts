// README screenshots of the real app with real players, phone and desktop, into docs/screenshots.
//   npm run build && npx next start -p 3111 &        (a production build, so no dev badge in the shots)
//   npx tsx scripts/readme-screenshots.mts
// It needs the Demo League (scripts/seed-demo.mts). To show a live draft it creates a temporary "Draft Preview"
// league, photographs it, and deletes it again. It also gives the demo teams sample pictures and turns Auto Lock-In on
// for the demo team that the shots are taken as.
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";

config({ path: ".env.local" });
const BASE = process.env.BASE ?? "http://localhost:3111";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const { db, schema } = await import("../src/db");
const { eq } = await import("drizzle-orm");
const leaguesSvc = await import("../src/server/leagues");
const draftSvc = await import("../src/server/draft");
const { setTeamLogo } = await import("../src/server/teamLogo");
const { pickInfo } = await import("../src/core/draft");

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
const byEmail = (e: string) => list?.users.find((u) => u.email?.toLowerCase() === e.toLowerCase());

const [demo] = await db.select().from(schema.leagues).where(eq(schema.leagues.name, "Demo League"));
if (!demo) throw new Error("Run scripts/seed-demo.mts first");
const adminUser = byEmail("admin@hoops.local");
if (!adminUser) throw new Error("Run scripts/seed-admin.mts first");

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });

// ---- sample team pictures (a colored tile with the initials), set through the same code the upload form uses ----
const demoTeams = await db.select().from(schema.teams).where(eq(schema.teams.leagueId, demo.id));
const TILE: Record<string, [string, string]> = { "Admin FC": ["#0c8312", "#0a5c10"], "Tejvir's Squad": ["#1d4ed8", "#1e3a8a"], "Sam's Splash Bros": ["#c2410c", "#7c2d12"], "Jo's Jumpers": ["#6d28d9", "#4c1d95"] };
const tilePage = await (await browser.newContext({ viewport: { width: 256, height: 256 } })).newPage();
for (const t of demoTeams) {
  const [a, b] = TILE[t.name] ?? ["#334155", "#0f172a"];
  const initials = t.name.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w[0]).slice(0, 2).join("");
  await tilePage.setContent(`<body style="margin:0"><div style="width:256px;height:256px;display:grid;place-items:center;background:linear-gradient(135deg,${a},${b});color:#fff;font:800 112px Inter,Helvetica,sans-serif;letter-spacing:-4px">${initials}</div></body>`);
  const jpg = await tilePage.screenshot({ type: "jpeg", quality: 88 });
  await setTeamLogo(t.id, `data:image/jpeg;base64,${jpg.toString("base64")}`);
}
const adminTeam = demoTeams.find((t) => t.ownerId === adminUser.id);
if (adminTeam) await db.update(schema.teams).set({ autoLock: true }).where(eq(schema.teams.id, adminTeam.id));

// ---- temporary live draft ----
let previewId: string | null = null;
try {
  const owner = byEmail((process.env.ADMIN_EMAILS ?? "").split(",")[0] ?? "");
  const bots = ["bot-sam@hoops.local", "bot-jo@hoops.local"].map(byEmail);
  previewId = await leaguesSvc.createLeague(adminUser.id, { name: "Draft Preview", teamName: "Admin FC" });
  let [pv] = await db.select().from(schema.leagues).where(eq(schema.leagues.id, previewId));
  if (owner) await leaguesSvc.joinLeague(owner.id, pv.inviteCode, "Tejvir's Squad");
  if (bots[0]) await leaguesSvc.joinLeague(bots[0].id, pv.inviteCode, "Sam's Splash Bros");
  if (bots[1]) await leaguesSvc.joinLeague(bots[1].id, pv.inviteCode, "Jo's Jumpers");
  await draftSvc.createDraft(pv);
  await draftSvc.startDraft(pv);
  const mine = (await db.select().from(schema.teams).where(eq(schema.teams.leagueId, previewId))).find((t) => t.ownerId === adminUser.id)!;
  // Let the bots (and auto-pick) make the early picks, then stop when it is Admin FC's turn.
  for (let i = 0; i < 40; i++) {
    const d = await draftSvc.getDraft(previewId);
    if (!d || d.status !== "live") break;
    if (d.currentPick > 6 && pickInfo(d.order, d.currentPick).teamId === mine.id) break;
    [pv] = await db.select().from(schema.leagues).where(eq(schema.leagues.id, previewId));
    await draftSvc.commissionerAutoPick(pv);
  }
  // Stop "overdue" timers from auto-picking while we take the shots.
  await db.update(schema.drafts).set({ deadline: new Date(Date.now() + 3_600_000) }).where(eq(schema.drafts.leagueId, previewId));

  // ---- sign in as the demo admin ----
  const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ref = new URL(URL_).hostname.split(".")[0];
  const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email: "admin@hoops.local", password: process.env.ADMIN_PASSWORD || "password" });
  if (error) throw error;
  const raw = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
  const chunks = raw.match(/.{1,3000}/g)!;
  const cookies = chunks.map((value, i) => ({ name: `sb-${ref}-auth-token${chunks.length > 1 ? `.${i}` : ""}`, value, domain: new URL(BASE).hostname, path: "/" }));

  const D = `/league/${demo.id}`;
  const P = `/league/${previewId}`;
  type Shot = { name: string; path: string; view: "mobile" | "desktop"; height?: number; accent?: string; fullPage?: boolean };
  const shots: Shot[] = [
    { name: "roster-desktop", path: `${D}/team`, view: "desktop", height: 1150 },
    { name: "roster-mobile", path: `${D}/team`, view: "mobile" },
    { name: "matchup-mobile", path: D, view: "mobile" },
    { name: "matchup-desktop", path: D, view: "desktop", height: 820 },
    { name: "draft-desktop", path: `${P}/draft`, view: "desktop", height: 900 },
    { name: "draft-mobile", path: `${P}/draft`, view: "mobile", height: 1500 },
    { name: "standings-mobile", path: `${D}/standings`, view: "mobile" },
    { name: "account-mobile", path: "/account", view: "mobile", accent: "Blue", height: 1100 },
  ];
  const views = {
    mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  } as const;
  for (const s of shots) {
    const v = views[s.view];
    const ctx = await browser.newContext({ ...v, viewport: { width: v.viewport.width, height: s.height ?? v.viewport.height } });
    await ctx.addCookies(cookies);
    const page = await ctx.newPage();
    await page.goto(BASE + s.path, { waitUntil: "networkidle", timeout: 60_000 });
    if (s.accent) await page.click(`button[aria-label="${s.accent}"]`); // previews the color exactly as a user picking it would see it
    await page.addStyleTag({ content: "form#lineup{display:none!important}" }); // the floating Save-lineup bar covers rows in a still image
    await page.screenshot({ path: `${OUT}/${s.name}.jpg`, type: "jpeg", quality: 82 });
    console.log("shot", s.name);
    await ctx.close();
  }
} finally {
  if (previewId) await db.delete(schema.leagues).where(eq(schema.leagues.id, previewId));
  await browser.close();
}
process.exit(0);
