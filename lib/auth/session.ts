import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverEnv } from "../env.js";
import { seal, unseal } from "./crypto.js";
import type { Org, User } from "../api/types.js";

/**
 * taskdeck's own session. It wraps the tokens keystone issued in an encrypted,
 * HttpOnly cookie so the browser never holds a bearer token. `getSession`
 * transparently refreshes the keystone access token when it's close to expiry.
 *
 * The initial population happens in `/api/auth/complete` after the keystone
 * OIDC round trip (ADR: keystone is the relying party and does PKCE; taskdeck
 * only holds the result).
 */
const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** epoch seconds the access token expires */
  expiresAt: z.number(),
  user: z.custom<User>(),
  org: z.custom<Org>(),
});

export type SessionData = z.infer<typeof sessionSchema>;

const REFRESH_SKEW_SECONDS = 60;

export async function setSession(data: SessionData): Promise<void> {
  const env = serverEnv();
  const jar = await cookies();
  jar.set(env.SESSION_COOKIE, await seal(JSON.stringify(data), env.SESSION_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.SESSION_TTL_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const env = serverEnv();
  (await cookies()).delete(env.SESSION_COOKIE);
}

/** Returns the session, refreshing the access token if it's about to expire. */
export async function getSession(): Promise<SessionData | null> {
  const env = serverEnv();
  const raw = (await cookies()).get(env.SESSION_COOKIE)?.value;
  if (!raw) return null;

  const json = await unseal(raw, env.SESSION_SECRET);
  if (!json) return null;

  const parsed = sessionSchema.safeParse(JSON.parse(json));
  if (!parsed.success) return null;
  let session = parsed.data;

  if (session.expiresAt - REFRESH_SKEW_SECONDS <= nowSeconds()) {
    const refreshed = await refresh(session.refreshToken);
    if (!refreshed) return null;
    session = { ...session, ...refreshed };
    await setSession(session);
  }
  return session;
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

async function refresh(
  refreshToken: string,
): Promise<Pick<SessionData, "accessToken" | "refreshToken" | "expiresAt"> | null> {
  const env = serverEnv();
  const res = await fetch(`${env.KEYSTONE_URL}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? refreshToken,
    expiresAt: nowSeconds() + body.expires_in,
  };
}

const nowSeconds = () => Math.floor(Date.now() / 1000);
