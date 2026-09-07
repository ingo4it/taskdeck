import { describe, expect, it } from "vitest";
import { parseSSE } from "@/lib/realtime/sse";

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

async function collect(s: ReadableStream<Uint8Array>) {
  const out = [];
  for await (const msg of parseSSE(s)) out.push(msg);
  return out;
}

describe("parseSSE", () => {
  it("parses event/data/id frames split across chunks", async () => {
    const msgs = await collect(
      streamOf("event: stage\nid: 7\nda", 'ta: {"type":"stage"}\n\nevent: pipeline\ndata: {"type":"pipeline"}\n\n'),
    );
    expect(msgs).toEqual([
      { event: "stage", id: "7", data: '{"type":"stage"}' },
      { event: "pipeline", id: undefined, data: '{"type":"pipeline"}' },
    ]);
  });

  it("joins multi-line data and ignores comment/heartbeat lines", async () => {
    const msgs = await collect(streamOf(": keep-alive\n\ndata: line1\ndata: line2\n\n"));
    expect(msgs).toEqual([{ event: "message", id: undefined, data: "line1\nline2" }]);
  });

  it("drops a frame with no data field", async () => {
    const msgs = await collect(streamOf("event: ping\n\ndata: real\n\n"));
    expect(msgs).toEqual([{ event: "message", id: undefined, data: "real" }]);
  });
});
