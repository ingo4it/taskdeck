/**
 * Wire types for the upstream services. These mirror the response shapes of
 * `keystone`, `pulseq`, and `modelgate` — taskdeck is a consumer, so these are
 * hand-maintained against those repos' OpenAPI specs / READMEs rather than
 * generated (kept small and readable on purpose).
 */

// ---- keystone: identity ----

export type User = {
  id: string;
  email: string;
  displayName: string;
  status: "ACTIVE" | "SUSPENDED";
  roles: string[];
};

export type Org = {
  id: string;
  slug: string;
  name: string;
  role: "owner" | "member";
};

export type Session = {
  user: User;
  org: Org;
  scopes: string[];
};

// ---- keystone: cursor-paginated envelope ----

export type Page<T> = {
  data: T[];
  page: { limit: number; hasMore: boolean; nextCursor: string | null };
};

// ---- documents (taskdeck domain, stored via keystone) ----

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";

export type Document = {
  id: string;
  orgId: string;
  title: string;
  filename: string;
  byteSize: number;
  status: DocumentStatus;
  pageCount: number | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
};

// ---- pulseq: the processing pipeline for one document ----

export type JobStage = "parse" | "extract" | "review";
export type JobStageState = "pending" | "running" | "succeeded" | "failed" | "dead";

export type JobStageStatus = {
  stage: JobStage;
  state: JobStageState;
  attempt: number;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
};

export type DocumentPipeline = {
  documentId: string;
  stages: JobStageStatus[];
  /** derived: overall status for the UI */
  overall: "queued" | "running" | "done" | "failed";
};

// ---- modelgate: AI review + Q&A ----

export type Citation = {
  documentId: string;
  sourceUri: string;
  title: string;
  ordinal: number;
  quote: string;
};

export type ReviewResult = {
  documentId: string;
  summary: string;
  findings: Array<{ severity: "info" | "warning" | "risk"; text: string; citations: Citation[] }>;
  model: string;
  createdAt: string;
};

export type Answer = {
  answer: string;
  citations: Citation[];
  model: string;
  fellBack: boolean;
};

// ---- SSE frame shapes ----

export type JobStreamEvent =
  | { type: "stage"; stage: JobStage; state: JobStageState; attempt: number }
  | { type: "pipeline"; overall: DocumentPipeline["overall"] }
  | { type: "error"; message: string };

export type AnswerStreamEvent =
  | { type: "meta"; retrievalMs: number; contextChunks: number }
  | { type: "delta"; text: string }
  | { type: "final"; citations: Citation[]; model: string; fellBack: boolean }
  | { type: "error"; code: string; title: string };
