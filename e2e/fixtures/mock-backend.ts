import type { Page, Route } from "@playwright/test";
import { seal } from "../../lib/auth/crypto";
import type { SessionData } from "../../lib/auth/session";
import { E2E_SESSION_SECRET } from "./e2e-secrets";

/**
 * Intercepts every call the browser makes to taskdeck's own `/api/*` surface
 * and answers with canned data, including a scripted pipeline SSE stream and a
 * scripted answer SSE stream. This is what lets the core-flow spec run without
 * the three backend services.
 */
const DOC = {
  id: "doc-e2e-1",
  orgId: "org-1",
  title: "Vendor MSA",
  filename: "vendor-msa.pdf",
  byteSize: 248_100,
  status: "ready",
  pageCount: 12,
  uploadedBy: "you",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function sse(...frames: Array<{ event: string; data: unknown; delayMs?: number }>): string {
  return frames.map((f) => `event: ${f.event}\ndata: ${JSON.stringify(f.data)}\n\n`).join("");
}

async function sealedSessionCookie(): Promise<string> {
  // Must actually decrypt via lib/auth/session.ts's getSession() — a plain
  // placeholder string fails unseal() and silently redirects every page to
  // /login, which is what a raw fake cookie value used to do here.
  const session: SessionData = {
    accessToken: "e2e-access-token",
    refreshToken: "e2e-refresh-token",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: "u-e2e",
      email: "demo@taskdeck.dev",
      displayName: "Demo User",
      status: "ACTIVE",
      roles: ["member"],
    },
    org: { id: "org-1", slug: "acme", name: "Acme Inc", role: "owner" },
  };
  return seal(JSON.stringify(session), E2E_SESSION_SECRET);
}

export async function mockBackend(page: Page): Promise<void> {
  // pretend we already have a session
  await page
    .context()
    .addCookies([{ name: "td_session", value: await sealedSessionCookie(), url: "http://localhost:3000" }]);

  await page.route("**/api/documents", async (route: Route) => {
    if (route.request().method() === "POST") {
      // A real create round trip takes long enough for the optimistic row
      // to actually render; fulfilling instantly can beat React's paint
      // and make the "uploading…" assertion race the response.
      await new Promise((r) => setTimeout(r, 800));
      return route.fulfill({
        status: 201,
        json: { ...DOC, id: "doc-e2e-2", status: "uploaded", title: "Uploaded" },
      });
    }
    return route.fulfill({ json: { data: [DOC], page: { limit: 20, hasMore: false, nextCursor: null } } });
  });

  await page.route("**/api/documents/doc-e2e-1", (route) => route.fulfill({ json: DOC }));

  await page.route("**/api/documents/doc-e2e-1/pipeline/stream", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: sse(
        { event: "stage", data: { type: "stage", stage: "parse", state: "succeeded", attempt: 1 } },
        { event: "stage", data: { type: "stage", stage: "extract", state: "succeeded", attempt: 1 } },
        { event: "stage", data: { type: "stage", stage: "review", state: "succeeded", attempt: 1 } },
        { event: "pipeline", data: { type: "pipeline", overall: "done" } },
      ),
    }),
  );

  await page.route("**/api/documents/doc-e2e-1/ask", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: sse(
        { event: "meta", data: { type: "meta", retrievalMs: 40, contextChunks: 4 } },
        { event: "delta", data: { type: "delta", text: "The termination notice period is " } },
        { event: "delta", data: { type: "delta", text: "30 days [1]." } },
        {
          event: "final",
          data: {
            type: "final",
            model: "claude-sonnet-5",
            fellBack: false,
            citations: [
              {
                documentId: "doc-e2e-1",
                sourceUri: "file://vendor-msa.pdf",
                title: "Vendor MSA",
                ordinal: 6,
                quote: "Either party may terminate on 30 days written notice.",
              },
            ],
          },
        },
      ),
    }),
  );

  await page.route("**/api/documents/doc-e2e-1/presence-ticket", (route) =>
    route.fulfill({ json: { ticket: "e2e-ticket" } }),
  );

  await page.route("**/api/auth/logout", (route) => route.fulfill({ json: { ok: true } }));
}
