import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "../auth/session";
import { backend, type Backend } from "./index";
import { isApiError } from "./errors";

/**
 * Wrap a route handler so it always runs with an authenticated backend gateway.
 * A missing session → 401. An `ApiError` from upstream is forwarded with its
 * status and problem body so the client sees the real reason.
 */
export function authed<T extends unknown[]>(
  handler: (ctx: { be: Backend; userId: string; orgId: string }, ...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { title: "Not authenticated", status: 401, code: "unauthenticated" },
        { status: 401 },
      );
    }
    try {
      return await handler(
        { be: backend(session.accessToken), userId: session.user.id, orgId: session.org.id },
        ...args,
      );
    } catch (err) {
      if (isApiError(err)) {
        return NextResponse.json(
          { title: err.message, status: err.status, code: err.code, detail: err.detail },
          { status: err.status },
        );
      }
      return NextResponse.json(
        { title: "Upstream error", status: 502, code: "bad_gateway" },
        { status: 502 },
      );
    }
  };
}
