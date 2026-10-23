import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/signup", "/forgot-password", "/auth", "/api/cron", "/manifest.webmanifest", "/pwa-icon", "/install"];

/**
 * Verifies the session once per request and forwards the verified identity to the page as
 * request headers, so server code doesn't need a second round-trip to Supabase Auth.
 * Incoming x-uid/x-email/x-name are always discarded first so a client can't spoof them.
 */
export async function middleware(req: NextRequest) {
  const forwarded = new Headers(req.headers);
  for (const h of ["x-uid", "x-email", "x-name"]) forwarded.delete(h);

  let res = NextResponse.next({ request: { headers: forwarded } });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (all) => {
        for (const { name, value } of all) req.cookies.set(name, value);
        res = NextResponse.next({ request: { headers: forwarded } });
        for (const { name, value, options } of all) res.cookies.set(name, value, options);
      },
    },
  });
  // getClaims verifies the JWT signature locally when the project uses asymmetric signing keys,
  // and falls back to asking Supabase Auth otherwise, so it is never less safe than getUser.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user = claims
    ? { id: claims.sub as string, email: (claims.email as string | undefined) ?? "", name: (claims.user_metadata as { display_name?: string } | undefined)?.display_name ?? "" }
    : null;
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (user && (path === "/login" || path === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user) {
    forwarded.set("x-uid", user.id);
    forwarded.set("x-email", user.email);
    forwarded.set("x-name", encodeURIComponent(user.name));
    const cookiesToKeep = res.cookies.getAll();
    res = NextResponse.next({ request: { headers: forwarded } });
    for (const c of cookiesToKeep) res.cookies.set(c);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico|webp)$).*)"] };
