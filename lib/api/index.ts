import { serverEnv, type LiveServerEnv } from "../env";
import { demoBackend } from "../demo/backend";
import { ApiClient } from "./client";
import type { Answer, Document, DocumentPipeline, Page, ReviewResult, Session } from "./types";

/**
 * The server-side gateway to the three backend services. Given the caller's
 * keystone access token, `backend(token)` returns typed method groups. The
 * browser never sees these — route handlers and server actions call them.
 *
 * In DEMO_MODE this is backed by in-process fixtures instead (see
 * `../demo/backend`) — same shape, so every caller above this line is
 * unaware which one it's talking to.
 */
export type Backend = {
  session(): Promise<Session>;
  documents: {
    list(params?: { limit?: number; cursor?: string }): Promise<Page<Document>>;
    get(id: string): Promise<Document>;
    create(input: { title: string; filename: string; byteSize: number }): Promise<Document>;
    remove(id: string): Promise<void>;
  };
  pipeline: {
    status(documentId: string): Promise<DocumentPipeline>;
    start(documentId: string): Promise<DocumentPipeline>;
    stream(documentId: string, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>>;
  };
  ai: {
    review(documentId: string): Promise<ReviewResult>;
    askStream(
      documentId: string,
      question: string,
      signal?: AbortSignal,
    ): Promise<ReadableStream<Uint8Array>>;
    ask(documentId: string, question: string): Promise<Answer>;
  };
};

export function backend(token: string): Backend {
  const env = serverEnv();
  if (env.DEMO_MODE) return demoBackend();
  // The schema's superRefine requires these three whenever DEMO_MODE is
  // false, but that constraint isn't expressible in the static type — this
  // cast just asserts what the runtime validation already guaranteed.
  return liveBackend(token, env as LiveServerEnv);
}

function liveBackend(token: string, env: LiveServerEnv): Backend {
  const keystone = new ApiClient({ service: "keystone", baseUrl: env.KEYSTONE_URL, token });
  const pulseq = new ApiClient({ service: "pulseq", baseUrl: env.PULSEQ_ADMIN_URL, token });
  const modelgate = new ApiClient({ service: "modelgate", baseUrl: env.MODELGATE_URL, token });

  return {
    session(): Promise<Session> {
      return keystone.request<Session>("/auth/session");
    },

    documents: {
      list(params: { limit?: number; cursor?: string } = {}): Promise<Page<Document>> {
        return keystone.request<Page<Document>>("/v1/documents", { query: params });
      },
      get(id: string): Promise<Document> {
        return keystone.request<Document>(`/v1/documents/${id}`);
      },
      create(input: { title: string; filename: string; byteSize: number }): Promise<Document> {
        return keystone.request<Document>("/v1/documents", { method: "POST", body: input });
      },
      remove(id: string): Promise<void> {
        return keystone.request<void>(`/v1/documents/${id}`, { method: "DELETE" });
      },
    },

    pipeline: {
      /** current state of the parse → extract → review pipeline for a document */
      status(documentId: string): Promise<DocumentPipeline> {
        return pulseq.request<DocumentPipeline>(`/v1/documents/${documentId}/pipeline`);
      },
      /** enqueue the pipeline (called after upload completes) */
      start(documentId: string): Promise<DocumentPipeline> {
        return pulseq.request<DocumentPipeline>(`/v1/documents/${documentId}/pipeline`, {
          method: "POST",
          idempotent: true, // safe: pulseq dedupes on documentId
        });
      },
      /** SSE: stage transitions for a document's pipeline */
      stream(documentId: string, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
        return pulseq.stream(`/v1/documents/${documentId}/pipeline/stream`, {
          method: "GET",
          signal,
        });
      },
    },

    ai: {
      review(documentId: string): Promise<ReviewResult> {
        return modelgate.request<ReviewResult>("/v1/review", {
          method: "POST",
          body: { documentId },
        });
      },
      /** SSE: token stream for a Q&A answer with citations */
      askStream(
        documentId: string,
        question: string,
        signal?: AbortSignal,
      ): Promise<ReadableStream<Uint8Array>> {
        return modelgate.stream("/v1/answer/stream", {
          body: { question, corpusTag: documentId },
          signal,
        });
      },
      ask(documentId: string, question: string): Promise<Answer> {
        return modelgate.request<Answer>("/v1/answer", {
          method: "POST",
          body: { question, corpusTag: documentId },
        });
      },
    },
  };
}
