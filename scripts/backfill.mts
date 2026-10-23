// Load historical box scores (used for draft rankings): npx tsx scripts/backfill.mts 20251021 20260413
import { config } from "dotenv";

config({ path: ".env.local" });
const { ingestDates } = await import("../src/server/sync");

const [from, to] = process.argv.slice(2);
const toDate = (s: string) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)));
const dates: string[] = [];
for (let t = toDate(from).getTime(); t <= toDate(to).getTime(); t += 86_400_000) {
  dates.push(new Date(t).toISOString().slice(0, 10).replace(/-/g, ""));
}
// Old finals have no need to be re-checked; "now" far in the future disables the recent-final window.
for (let i = 0; i < dates.length; i += 14) {
  for (let attempt = 1; ; attempt++) {
    try {
      console.log(dates[i], await ingestDates(dates.slice(i, i + 14), new Date("2100-01-01")));
      break;
    } catch (e) {
      const cause = (e as { cause?: Error }).cause;
      console.log(`attempt ${attempt} failed:`, cause?.message ?? (e as Error).message);
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}
process.exit(0);
