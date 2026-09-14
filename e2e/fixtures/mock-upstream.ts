import { createServer, type Server } from "node:http";

/**
 * Stands in for keystone + pulseq + modelgate for the one class of request
 * `page.route()` can't reach: the SSR fetches server components make
 * directly (`backend(token).documents.list()` and friends in
 * `app/dashboard/page.tsx` / `app/dashboard/documents/[id]/page.tsx`).
 * Those run inside the Next.js server process itself, never through the
 * browser's network stack, so Playwright's browser-side route mocking never
 * sees them — this is a real Node HTTP server instead, one process the Next
 * server can actually reach.
 *
 * Client-initiated requests (uploads, the pipeline/ask SSE streams, which
 * are all proxied through taskdeck's own `/api/*` route handlers and then
 * fetched from the browser) are still covered by `mockBackend`'s
 * `page.route()` interception — this only fills the SSR gap.
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

const PIPELINE = {
  documentId: DOC.id,
  overall: "done",
  stages: (["parse", "extract", "review"] as const).map((stage) => ({
    stage,
    state: "succeeded",
    attempt: 1,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    error: null,
  })),
};

const REVIEW = {
  documentId: DOC.id,
  summary: "No unusual terms found; standard 30-day termination clause.",
  findings: [
    {
      severity: "info",
      text: "Either party may terminate on 30 days written notice.",
      citations: [
        {
          documentId: DOC.id,
          sourceUri: "file://vendor-msa.pdf",
          title: "Vendor MSA",
          ordinal: 6,
          quote: "Either party may terminate on 30 days written notice.",
        },
      ],
    },
  ],
  model: "claude-sonnet-5",
  createdAt: new Date().toISOString(),
};

function json(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * Playwright re-evaluates this config module once per worker process, so
 * this runs more than once on the same machine — every worker after the
 * first hits EADDRINUSE binding the same fixed port. That's fine: it means
 * a sibling worker's server is already up and serving the exact same
 * canned responses, so the failure is swallowed rather than surfaced.
 */
export function startMockUpstream(port: number): Server {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    if (req.method === "GET" && url.pathname === "/v1/documents") {
      return json(res, 200, { data: [DOC], page: { limit: 20, hasMore: false, nextCursor: null } });
    }
    if (req.method === "GET" && url.pathname === `/v1/documents/${DOC.id}`) {
      return json(res, 200, DOC);
    }
    if (req.method === "GET" && url.pathname === `/v1/documents/${DOC.id}/pipeline`) {
      return json(res, 200, PIPELINE);
    }
    if (req.method === "POST" && url.pathname === "/v1/review") {
      return json(res, 200, REVIEW);
    }
    return json(res, 404, { title: "not found (e2e mock upstream)", status: 404 });
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code !== "EADDRINUSE") throw err;
  });
  server.listen(port);
  return server;
}
