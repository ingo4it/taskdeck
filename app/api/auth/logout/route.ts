import { NextResponse } from "next/server";
import { serverEnv, publicEnv } from "@/lib/env";
import { clearSession } from "@/lib/auth/session";

export async function POST(): Promise<NextResponse> {
  // best effort: tell keystone to revoke the refresh-token family
  await fetch(`${serverEnv().KEYSTONE_URL}/auth/logout`, { method: "POST" }).catch(() => undefined);
  await clearSession();
  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse {
  return NextResponse.redirect(new URL("/login", publicEnv.NEXT_PUBLIC_APP_URL));
}
