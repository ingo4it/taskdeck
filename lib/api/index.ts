import { serverEnv } from "../env.js";
import { ApiClient } from "./client.js";
import type {
  Answer,
  Document,
  DocumentPipeline,
  Page,
  ReviewResult,
  Session,
} from "./types.js";

/**
 * The server-side gateway to the three backend services. Given the caller's
 * keystone access token, `backend(token)` returns typed method groups. The
 * browser never sees these — route handlers and server actions call them.
 */
export function backend(token: string) {
  const env = serverEnv();
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

export type Backend = ReturnType<typeof backend>;
