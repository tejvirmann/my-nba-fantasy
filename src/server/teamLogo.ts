import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { UserError } from "./leagues";

const { teamLogos, teams } = schema;

/** The browser shrinks the picture to a 256px JPEG first, so anything much bigger than this is not ours. */
const MAX_BASE64_CHARS = 200_000;

/** Accepts a `data:image/jpeg;base64,…` string, checks it really is a small JPEG, and stores it for the team. */
export async function setTeamLogo(teamId: string, dataUrl: string): Promise<void> {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!m) throw new UserError("Pick a photo (JPG, PNG or WebP).");
  if (m[1].length > MAX_BASE64_CHARS) throw new UserError("That picture is too large. Try a smaller one.");
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new UserError("That file doesn't look like a photo.");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(teamLogos).values({ teamId, data: m[1], updatedAt: now }).onConflictDoUpdate({ target: teamLogos.teamId, set: { data: m[1], updatedAt: now } });
    await tx.update(teams).set({ logoUpdatedAt: now }).where(eq(teams.id, teamId));
  });
}

export async function clearTeamLogo(teamId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(teamLogos).where(eq(teamLogos.teamId, teamId));
    await tx.update(teams).set({ logoUpdatedAt: null }).where(eq(teams.id, teamId));
  });
}

export async function getTeamLogo(teamId: string): Promise<Buffer | null> {
  const [row] = await db.select({ data: teamLogos.data }).from(teamLogos).where(eq(teamLogos.teamId, teamId));
  return row ? Buffer.from(row.data, "base64") : null;
}
