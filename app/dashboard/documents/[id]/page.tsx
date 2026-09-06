import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { backend } from "@/lib/api";
import { isApiError } from "@/lib/api/errors";
import { JobPipeline } from "@/components/jobs/JobPipeline";
import { ReviewPanel } from "@/components/ai/ReviewPanel";
import { AskBox } from "@/components/ai/AskBox";
import { PresenceBar } from "@/components/presence/PresenceBar";
import { Badge } from "@/components/ui/primitives";
import { formatBytes } from "@/lib/utils";
import type { ReviewResult } from "@/lib/api/types";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const be = backend(session.accessToken);

  const doc = await be.documents.get(id).catch((err) => {
    if (isApiError(err) && err.status === 404) notFound();
    throw err;
  });

  // pipeline + review are best-effort — the page renders even if a downstream
  // is slow; the pipeline component then fills in over SSE.
  const [pipeline, review] = await Promise.all([
    be.pipeline.status(id).catch(() => ({
      documentId: id,
      overall: "queued" as const,
      stages: (["parse", "extract", "review"] as const).map((stage) => ({
        stage,
        state: "pending" as const,
        attempt: 0,
        startedAt: null,
        finishedAt: null,
        error: null,
      })),
    })),
    doc.status === "ready" ? be.ai.review(id).catch(() => null) : Promise.resolve<ReviewResult | null>(null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{doc.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <span>{doc.filename}</span>
            <span>·</span>
            <span>{formatBytes(doc.byteSize)}</span>
            {doc.pageCount ? (
              <>
                <span>·</span>
                <span>{doc.pageCount} pages</span>
              </>
            ) : null}
            <Badge tone={doc.status === "failed" ? "danger" : doc.status === "ready" ? "success" : "info"}>
              {doc.status}
            </Badge>
          </p>
        </div>
        <PresenceBar documentId={id} />
      </div>

      <JobPipeline initial={pipeline} />
      <ReviewPanel review={review} />
      <AskBox documentId={id} />
    </div>
  );
}
