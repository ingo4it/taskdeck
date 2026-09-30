import "server-only";
import type {
  AnswerStreamEvent,
  DocumentPipeline,
  JobStreamEvent,
  Org,
  ReviewResult,
  User,
} from "../api/types";

/**
 * Fixture data for DEMO_MODE. Deliberately the same shape (and, for the
 * document, the same content) as the e2e suite's fixtures — one dataset that's
 * been exercised by both an automated test and a human clicking around.
 */
export const DEMO_USER: User = {
  id: "demo-user",
  email: "demo@taskdeck.dev",
  displayName: "Demo User",
  status: "ACTIVE",
  roles: ["member"],
};

export const DEMO_ORG: Org = { id: "org-demo", slug: "acme", name: "Acme Inc", role: "owner" };

export const DEMO_DOC = {
  id: "doc-demo-1",
  orgId: DEMO_ORG.id,
  title: "Vendor MSA",
  filename: "vendor-msa.pdf",
  byteSize: 248_100,
  status: "ready" as const,
  pageCount: 12,
  uploadedBy: DEMO_USER.displayName,
  createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
};

export const DEMO_PIPELINE: DocumentPipeline = {
  documentId: DEMO_DOC.id,
  overall: "done",
  stages: (["parse", "extract", "review"] as const).map((stage) => ({
    stage,
    state: "succeeded",
    attempt: 1,
    startedAt: new Date(Date.now() - 3_600_000).toISOString(),
    finishedAt: new Date(Date.now() - 3_500_000).toISOString(),
    error: null,
  })),
};

export const DEMO_REVIEW: ReviewResult = {
  documentId: DEMO_DOC.id,
  summary: "No unusual terms found; standard 30-day termination clause and typical liability caps.",
  findings: [
    {
      severity: "info",
      text: "Either party may terminate on 30 days written notice.",
      citations: [
        {
          documentId: DEMO_DOC.id,
          sourceUri: "file://vendor-msa.pdf",
          title: DEMO_DOC.title,
          ordinal: 6,
          quote: "Either party may terminate on 30 days written notice.",
        },
      ],
    },
    {
      severity: "warning",
      text: "Liability is capped at 12 months of fees, which is on the lower end for a contract this size.",
      citations: [
        {
          documentId: DEMO_DOC.id,
          sourceUri: "file://vendor-msa.pdf",
          title: DEMO_DOC.title,
          ordinal: 9,
          quote:
            "Total liability under this agreement shall not exceed fees paid in the preceding twelve months.",
        },
      ],
    },
  ],
  model: "claude-sonnet-5",
  createdAt: new Date(Date.now() - 3_500_000).toISOString(),
};

/** One canned, on-topic answer — the demo doesn't run a real model. */
export const DEMO_ANSWER = {
  text: "The termination notice period is 30 days [1].",
  citations: [
    {
      documentId: DEMO_DOC.id,
      sourceUri: "file://vendor-msa.pdf",
      title: DEMO_DOC.title,
      ordinal: 6,
      quote: "Either party may terminate on 30 days written notice.",
    },
  ],
};

function sseFrame(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Replays canned pipeline stage events with realistic pacing, then closes. */
export function demoPipelineStream(signal?: AbortSignal): ReadableStream<Uint8Array> {
  const events: Array<{ delayMs: number; event: string; data: JobStreamEvent }> = [
    { delayMs: 300, event: "stage", data: { type: "stage", stage: "parse", state: "succeeded", attempt: 1 } },
    {
      delayMs: 900,
      event: "stage",
      data: { type: "stage", stage: "extract", state: "succeeded", attempt: 1 },
    },
    {
      delayMs: 900,
      event: "stage",
      data: { type: "stage", stage: "review", state: "succeeded", attempt: 1 },
    },
    { delayMs: 300, event: "pipeline", data: { type: "pipeline", overall: "done" } },
  ];
  return new ReadableStream({
    async start(controller) {
      for (const e of events) {
        if (signal?.aborted) return controller.close();
        await sleep(e.delayMs);
        controller.enqueue(sseFrame(e.event, e.data));
      }
      controller.close();
    },
  });
}

/** Streams the canned answer a few words at a time, like a real model would. */
export function demoAnswerStream(signal?: AbortSignal): ReadableStream<Uint8Array> {
  const words = DEMO_ANSWER.text.match(/\S+\s*/g) ?? [];
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(sseFrame("meta", { type: "meta", retrievalMs: 60, contextChunks: 4 }));
      for (const w of words) {
        if (signal?.aborted) return controller.close();
        await sleep(120);
        controller.enqueue(sseFrame("delta", { type: "delta", text: w } satisfies AnswerStreamEvent));
      }
      controller.enqueue(
        sseFrame("final", {
          type: "final",
          citations: DEMO_ANSWER.citations,
          model: "claude-sonnet-5",
          fellBack: false,
        } satisfies AnswerStreamEvent),
      );
      controller.close();
    },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
