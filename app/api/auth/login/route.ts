import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/env";

/**
 * Kick off login. Redirects to keystone, which runs authorization-code + PKCE
 * against the upstream IdP and then bounces back to `/api/auth/complete`.
 * `next` (a same-site path) is round-tripped so we can land the user where they
 * were headed.
 */
export function GET(req: NextRequest): NextResponse {
  const next = req.nextUrl.searchParams.get("next");
  const returnTo = new URL("/api/auth/complete", publicEnv.NEXT_PUBLIC_APP_URL);
  if (next && next.startsWith("/")) returnTo.searchParams.set("next", next);

  const login = new URL("/auth/login", serverEnv().KEYSTONE_URL);
  login.searchParams.set("return_to", returnTo.toString());

  return NextResponse.redirect(login);
}
