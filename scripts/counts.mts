import { config } from "dotenv";
config({ path: ".env.local" });
const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const rows = await db.execute(sql`select (select count(*) from player_game_stats) as lines, (select count(*) from nba_games) as games, (select count(*) from players) as players, (select count(*) from sync_runs) as runs`);
console.log(rows[0]);
process.exit(0);
