// Renders every mockup to mockups/png/<screen>-<variant>-<mobile|desktop>.jpg:  npx tsx mockups/shoot.mts [screenId...]
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const dir = new URL("./screens/", import.meta.url).pathname;
const out = new URL("./png/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".html") && (!only.length || only.some((o) => f.startsWith(o + "-"))));

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const devices = [
  { name: "mobile", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true },
  { name: "desktop", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false },
];
for (const d of devices) {
  const { name, ...opts } = d;
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  for (const f of files) {
    await page.goto(`file://${dir}${f}`);
    if (name === "mobile") {
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 1) console.log(`  OVERFLOW ${over}px: ${f}`);
    }
    await page.screenshot({ path: `${out}${f.replace(".html", "")}-${name}.jpg`, fullPage: true, type: "jpeg", quality: 80 });
  }
  await ctx.close();
}
await browser.close();
console.log(`rendered ${files.length * 2} images`);
