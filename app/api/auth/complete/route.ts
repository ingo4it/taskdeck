import { NextResponse, type NextRequest } from "next/server";
import { serverEnv, publicEnv } from "@/lib/env";
import { setSession } from "@/lib/auth/session";
import type { Session } from "@/lib/api/types";

/**
 * keystone's callback lands here. keystone has set its own HttpOnly refresh
 * cookie on this host; we exchange it for a first access token, read the
 * session, and seal both into taskdeck's own session cookie.
 *
 * (Simplification: in a cross-origin deployment keystone would hand back a
 * one-time ticket instead of relying on a shared-host cookie. The exchange seam
 * is the same either way — see ADR notes.)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const env = serverEnv();
  const next = req.nextUrl.searchParams.get("next");
  const dest = new URL(next && next.startsWith("/") ? next : "/dashboard", publicEnv.NEXT_PUBLIC_APP_URL);

  try {
    const tokenRes = await fetch(`${env.KEYSTONE_URL}/auth/token`, {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    if (!tokenRes.ok) throw new Error(`token exchange ${tokenRes.status}`);
    const token = (await tokenRes.json()) as { access_token: string; expires_in: number; refresh_token?: string };

    const sessionRes = await fetch(`${env.KEYSTONE_URL}/auth/session`, {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!sessionRes.ok) throw new Error(`session ${sessionRes.status}`);
    const s = (await sessionRes.json()) as Session;

    await setSession({
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? "",
      expiresAt: Math.floor(Date.now() / 1000) + token.expires_in,
      user: s.user,
      org: s.org,
    });

    return NextResponse.redirect(dest);
  } catch (err) {
    const login = new URL("/login", publicEnv.NEXT_PUBLIC_APP_URL);
    login.searchParams.set("error", err instanceof Error ? err.message : "unknown");
    return NextResponse.redirect(login);
  }
}
