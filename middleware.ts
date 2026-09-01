import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge gate: bounce unauthenticated requests for app routes to /login
 * before they render. This only checks for the session cookie's presence — the
 * cryptographic check and refresh happen in `getSession()` on the server. It
 * saves a render, it isn't the security boundary.
 */
const SESSION_COOKIE = process.env.SESSION_COOKIE ?? "td_session";

export function middleware(req: NextRequest): NextResponse {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const { pathname } = req.nextUrl;

  if (!hasSession && pathname.startsWith("/dashboard")) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
