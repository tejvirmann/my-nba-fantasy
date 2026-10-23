// Manual sync from the terminal: npx tsx scripts/sync.mts [daysBack] [--players]
import { config } from "dotenv";

config({ path: ".env.local" });
const { runSync } = await import("../src/server/sync");

const daysBack = Number(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : 3);
const result = await runSync({ kind: "manual", daysBack, daysForward: 7, refreshPlayers: process.argv.includes("--players") });
console.log(result);
process.exit(0);
