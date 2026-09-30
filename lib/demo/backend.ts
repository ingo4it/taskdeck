import "server-only";
import type { Backend } from "../api/index";
import { ApiError } from "../api/errors";
import type { Document, DocumentPipeline } from "../api/types";
import {
  DEMO_ANSWER,
  DEMO_DOC,
  DEMO_ORG,
  DEMO_PIPELINE,
  DEMO_REVIEW,
  DEMO_USER,
  demoAnswerStream,
  demoPipelineStream,
} from "./data";

const PENDING_PIPELINE = (documentId: string): DocumentPipeline => ({
  documentId,
  overall: "queued",
  stages: (["parse", "extract", "review"] as const).map((stage) => ({
    stage,
    state: "pending",
    attempt: 0,
    startedAt: null,
    finishedAt: null,
    error: null,
  })),
});

/**
 * Stands in for keystone + pulseq + modelgate when DEMO_MODE is on. Same
 * `Backend` shape as the real gateway, so every route handler and server
 * component above it is unaware which one it's calling.
 *
 * State is deliberately not persisted: this runs on stateless serverless
 * functions, so "uploading" a document produces a realistic response but
 * doesn't survive to the next request. The one document that matters for the
 * demo (the seeded "Vendor MSA") is always there.
 */
export function demoBackend(): Backend {
  return {
    async session() {
      return { user: DEMO_USER, org: DEMO_ORG, scopes: ["documents:read", "documents:write"] };
    },

    documents: {
      async list() {
        return { data: [DEMO_DOC], page: { limit: 20, hasMore: false, nextCursor: null } };
      },
      async get(id: string): Promise<Document> {
        if (id !== DEMO_DOC.id) {
          throw new ApiError("keystone", { title: "Document not found", status: 404 });
        }
        return DEMO_DOC;
      },
      async create(input): Promise<Document> {
        // Echoes a freshly "uploaded" document so the optimistic-UI flow has
        // something real to reconcile with — see the note above on state.
        return {
          id: `demo-${Date.now()}`,
          orgId: DEMO_ORG.id,
          title: input.title,
          filename: input.filename,
          byteSize: input.byteSize,
          status: "uploaded",
          pageCount: null,
          uploadedBy: DEMO_USER.displayName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
      async remove() {
        // no-op — nothing is actually persisted to remove
      },
    },

    pipeline: {
      async status(documentId: string): Promise<DocumentPipeline> {
        return documentId === DEMO_DOC.id ? DEMO_PIPELINE : PENDING_PIPELINE(documentId);
      },
      async start(documentId: string): Promise<DocumentPipeline> {
        return documentId === DEMO_DOC.id ? DEMO_PIPELINE : PENDING_PIPELINE(documentId);
      },
      async stream(_documentId: string, signal?: AbortSignal) {
        return demoPipelineStream(signal);
      },
    },

    ai: {
      async review(documentId: string) {
        return { ...DEMO_REVIEW, documentId };
      },
      async askStream(_documentId: string, _question: string, signal?: AbortSignal) {
        return demoAnswerStream(signal);
      },
      async ask() {
        return {
          answer: DEMO_ANSWER.text,
          citations: DEMO_ANSWER.citations,
          model: "claude-sonnet-5",
          fellBack: false,
        };
      },
    },
  };
}
