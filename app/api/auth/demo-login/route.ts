import { NextResponse } from "next/server";
import { serverEnv, publicEnv } from "@/lib/env";
import { setSession } from "@/lib/auth/session";
import { DEMO_ORG, DEMO_USER } from "@/lib/demo/data";

/**
 * The only login path in DEMO_MODE — there's no real keystone to run OIDC
 * against, so this mints a session directly instead of redirecting through
 * `/api/auth/login` + `/api/auth/complete`. Those two routes are left
 * untouched for a real deployment; this one just doesn't exist in that case.
 */
export async function GET(): Promise<NextResponse> {
  if (!serverEnv().DEMO_MODE) {
    return NextResponse.redirect(new URL("/login", publicEnv.NEXT_PUBLIC_APP_URL));
  }

  await setSession({
    accessToken: "demo-access-token",
    refreshToken: "demo-refresh-token",
    // Far enough out that getSession()'s refresh path — which calls the real
    // KEYSTONE_URL — never triggers during a demo session.
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    user: DEMO_USER,
    org: DEMO_ORG,
  });

  return NextResponse.redirect(new URL("/dashboard", publicEnv.NEXT_PUBLIC_APP_URL));
}
