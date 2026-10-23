import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { settleAll } from "@/server/settle";
import { runSync } from "@/server/sync";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await runSync({ kind: "cron", daysBack: 3, daysForward: 7, refreshPlayers: true, afterSync: () => settleAll() });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("cron sync failed", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}


