import { z } from "zod";
import { authed } from "@/lib/api/route";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ question: z.string().min(1).max(2000) });

/**
 * Proxies modelgate's streamed answer for a document's Q&A. Body carries the
 * question; the document id becomes modelgate's `corpusTag` so retrieval is
 * scoped to that document. Abort propagates upstream (modelgate stops
 * generating and stops billing).
 */
export const POST = authed(async ({ be }, req: Request, { params }: Params) => {
  const { id } = await params;
  const { question } = bodySchema.parse(await req.json());
  const upstream = await be.ai.askStream(id, question, req.signal);
  return new Response(upstream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
    },
  });
});
