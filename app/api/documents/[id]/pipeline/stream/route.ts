import { authed } from "@/lib/api/route";

type Params = { params: Promise<{ id: string }> };

/**
 * Proxies pulseq's pipeline SSE stream to the browser, attaching the session on
 * the way out. The client `EventSource`/fetch never talks to pulseq directly.
 * The request's abort signal is forwarded so closing the tab tears down the
 * upstream connection too.
 */
export const GET = authed(async ({ be }, req: Request, { params }: Params) => {
  const { id } = await params;
  const upstream = await be.pipeline.stream(id, req.signal);
  return new Response(upstream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
});
