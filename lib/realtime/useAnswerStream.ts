"use client";

import { useCallback, useRef, useState } from "react";
import { parseSSE } from "./sse.js";
import type { AnswerStreamEvent, Citation } from "../api/types.js";

/**
 * Drives a streamed Q&A answer. `ask()` opens the SSE stream (via taskdeck's
 * `/api/documents/[id]/ask` route → modelgate), appends token deltas to `text`
 * as they arrive, and finalises with citations. `cancel()` aborts mid-stream —
 * modelgate stops generating and stops billing.
 *
 * Unlike the job stream this is a single request, not a long-lived subscription,
 * so it doesn't reconnect: a dropped answer stream is surfaced and the user
 * re-asks.
 */
export type AnswerState = {
  status: "idle" | "streaming" | "done" | "error";
  text: string;
  citations: Citation[];
  model: string | null;
  fellBack: boolean;
  error: string | null;
};

const initial: AnswerState = {
  status: "idle",
  text: "",
  citations: [],
  model: null,
  fellBack: false,
  error: null,
};

export function useAnswerStream(documentId: string) {
  const [state, setState] = useState<AnswerState>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => (s.status === "streaming" ? { ...s, status: "done" } : s));
  }, []);

  const ask = useCallback(
    async (question: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ ...initial, status: "streaming" });

      try {
        const res = await fetch(`/api/documents/${documentId}/ask`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "text/event-stream" },
          body: JSON.stringify({ question }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`ask failed: ${res.status}`);

        for await (const msg of parseSSE(res.body, controller.signal)) {
          const evt = JSON.parse(msg.data) as AnswerStreamEvent;
          if (evt.type === "delta") {
            setState((s) => ({ ...s, text: s.text + evt.text }));
          } else if (evt.type === "final") {
            setState((s) => ({
              ...s,
              status: "done",
              citations: evt.citations,
              model: evt.model,
              fellBack: evt.fellBack,
            }));
          } else if (evt.type === "error") {
            setState((s) => ({ ...s, status: "error", error: evt.title }));
          }
        }
        setState((s) => (s.status === "streaming" ? { ...s, status: "done" } : s));
      } catch (err) {
        if (controller.signal.aborted) return;
        setState((s) => ({ ...s, status: "error", error: (err as Error).message }));
      }
    },
    [documentId],
  );

  return { ...state, ask, cancel, reset: () => setState(initial) };
}
