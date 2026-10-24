import { getTeamLogo } from "@/server/teamLogo";

export const dynamic = "force-dynamic";

/** A team's picture. Requires a signed-in user (middleware); the URL carries ?v=<updated time>, so it can be cached for good. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const img = await getTeamLogo(id);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
