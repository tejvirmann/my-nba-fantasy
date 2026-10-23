// Real browser check: log in with a username (not an email) through the UI.
import { chromium } from "playwright-core";
const BASE = process.env.BASE ?? "http://localhost:3111";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin");
await page.fill('input[name="password"]', "password");
await Promise.all([page.waitForURL(`${BASE}/`, { timeout: 30_000 }), page.click('button[type="submit"]')]);
console.log("logged in as admin ->", page.url(), "| sees Admin link:", await page.getByRole("link", { name: "Admin" }).count() > 0);
await page.goto(`${BASE}/login`);
console.log("redirected away from /login when signed in ->", page.url());
await browser.close();
