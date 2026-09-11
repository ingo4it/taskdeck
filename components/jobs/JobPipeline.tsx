"use client";

import { useJobStream } from "@/lib/realtime/useJobStream";
import { StageBadge } from "./StageBadge";
import { Badge, Card } from "@/components/ui/primitives";
import { cn, relativeTime } from "@/lib/utils";
import type { DocumentPipeline } from "@/lib/api/types";

const STAGE_LABEL = { parse: "Parse", extract: "Extract", review: "AI review" } as const;

/**
 * Live view of a document's parse → extract → review pipeline. Seeded with the
 * server-rendered `initial` so it's correct on first paint, then kept current
 * by the SSE stream. `status` shows connection state so a dropped stream is
 * visible rather than silently stale.
 */
export function JobPipeline({ initial }: { initial: DocumentPipeline }) {
  const { pipeline, status } = useJobStream(initial.documentId, initial);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Processing</h2>
        <div className="flex items-center gap-2">
          <OverallBadge overall={pipeline.overall} />
          {status !== "open" ? (
            <span className="text-xs text-[var(--color-muted)]" aria-live="polite">
              {status === "reconnecting" ? "reconnecting…" : status}
            </span>
          ) : null}
        </div>
      </div>

      <ol className="space-y-2">
        {pipeline.stages.map((stage, i) => (
          <li
            key={stage.stage}
            className={cn(
              "flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2",
              stage.state === "running" && "border-[var(--color-accent)]/50",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-muted)] tabular-nums">{i + 1}</span>
              <span className="text-sm">{STAGE_LABEL[stage.stage]}</span>
            </div>
            <div className="flex items-center gap-3">
              {stage.finishedAt ? (
                <span className="text-xs text-[var(--color-muted)]">{relativeTime(stage.finishedAt)}</span>
              ) : null}
              <StageBadge state={stage.state} attempt={stage.attempt} />
            </div>
          </li>
        ))}
      </ol>

      {pipeline.stages.find((s) => s.error) ? (
        <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-300">
          {pipeline.stages.find((s) => s.error)?.error}
        </p>
      ) : null}
    </Card>
  );
}

function OverallBadge({ overall }: { overall: DocumentPipeline["overall"] }) {
  const map = {
    queued: ["neutral", "Queued"],
    running: ["info", "Running"],
    done: ["success", "Complete"],
    failed: ["danger", "Failed"],
  } as const;
  const [tone, text] = map[overall];
  return <Badge tone={tone}>{text}</Badge>;
}
