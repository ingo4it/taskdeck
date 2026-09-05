import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { CitationList } from "./CitationList";
import type { ReviewResult } from "@/lib/api/types";

const sevTone = { info: "info", warning: "warning", risk: "danger" } as const;

/**
 * The AI review result for a document (from modelgate, run as the last pipeline
 * stage). Server-rendered — it's a completed artifact, not a stream. The Q&A
 * box below it is the streaming part.
 */
export function ReviewPanel({ review }: { review: ReviewResult | null }) {
  if (!review) {
    return (
      <EmptyState
        title="No review yet"
        hint="The AI review runs after parsing and extraction finish. It'll appear here automatically."
      />
    );
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">AI review</h2>
        <span className="text-xs text-[var(--color-muted)]">{review.model}</span>
      </div>
      <p className="text-sm">{review.summary}</p>

      <ul className="mt-4 space-y-3">
        {review.findings.map((f, i) => (
          <li key={i} className="rounded-md border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-2">
              <Badge tone={sevTone[f.severity]}>{f.severity}</Badge>
            </div>
            <p className="mt-1.5 text-sm">{f.text}</p>
            <CitationList citations={f.citations} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
