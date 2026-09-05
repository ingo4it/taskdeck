"use client";

import { useState } from "react";
import { useAnswerStream } from "@/lib/realtime/useAnswerStream";
import { Button } from "@/components/ui/button";
import { Badge, Card, Spinner } from "@/components/ui/primitives";
import { CitationList } from "./CitationList";

/**
 * Streamed document Q&A. Submitting opens an SSE stream to modelgate (via
 * taskdeck's route); token deltas render as they arrive, then citations and the
 * model that answered. "Stop" aborts mid-stream. A `fellBack` badge shows when
 * modelgate served the answer from its secondary model.
 */
export function AskBox({ documentId }: { documentId: string }) {
  const [question, setQuestion] = useState("");
  const { status, text, citations, model, fellBack, error, ask, cancel, reset } = useAnswerStream(documentId);

  const streaming = status === "streaming";

  return (
    <Card>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim() && !streaming) void ask(question.trim());
        }}
      >
        <input
          className="h-9 flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm outline-none focus-visible:border-[var(--color-accent)]"
          placeholder="Ask a question about this document…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label="Question"
        />
        {streaming ? (
          <Button type="button" variant="ghost" onClick={cancel}>
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!question.trim()}>
            Ask
          </Button>
        )}
      </form>

      {(text || streaming || error) && (
        <div className="mt-3 text-sm">
          {error ? (
            <p role="alert" className="text-red-600 dark:text-red-300">
              {error}{" "}
              <button className="underline" onClick={reset}>
                try again
              </button>
            </p>
          ) : (
            <>
              <p className="whitespace-pre-wrap">
                {text}
                {streaming ? <Spinner label="Answering" /> : null}
              </p>
              {status === "done" ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span>{model}</span>
                  {fellBack ? <Badge tone="warning">served by fallback model</Badge> : null}
                </div>
              ) : null}
              <CitationList citations={citations} />
            </>
          )}
        </div>
      )}
    </Card>
  );
}
