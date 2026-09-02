import { NextResponse } from "next/server";
import { authed } from "@/lib/api/route";
import { seal } from "@/lib/auth/crypto";
import { serverEnv } from "@/lib/env";

type Params = { params: Promise<{ id: string }> };

/**
 * Mints a short-lived, single-purpose ticket for the presence WebSocket. The WS
 * gateway is a different origin and can't read taskdeck's session cookie, so
 * the browser gets this opaque ticket (60s TTL, scoped to one document + user)
 * to present on connect.
 */
export const POST = authed(async ({ userId }, _req: Request, { params }: Params) => {
  const { id } = await params;
  const ticket = await seal(
    JSON.stringify({ userId, documentId: id, exp: Math.floor(Date.now() / 1000) + 60 }),
    serverEnv().SESSION_SECRET,
  );
  return NextResponse.json({ ticket });
});
