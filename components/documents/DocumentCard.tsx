import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { formatBytes, relativeTime } from "@/lib/utils";
import type { Document, DocumentStatus } from "@/lib/api/types";

const statusTone: Record<DocumentStatus, "neutral" | "info" | "success" | "danger"> = {
  uploaded: "neutral",
  processing: "info",
  ready: "success",
  failed: "danger",
};

export function DocumentCard({ doc }: { doc: Document }) {
  const optimistic = doc.id.startsWith("optimistic-");
  return (
    <Link
      href={optimistic ? "#" : `/dashboard/documents/${doc.id}`}
      aria-disabled={optimistic}
      className="block rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]/50 aria-disabled:pointer-events-none aria-disabled:opacity-60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{doc.title}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">{doc.filename}</p>
        </div>
        <Badge tone={statusTone[doc.status]}>{optimistic ? "uploading…" : doc.status}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <span>{formatBytes(doc.byteSize)}</span>
        {doc.pageCount ? <span>{doc.pageCount} pages</span> : null}
        <span>·</span>
        <span>{relativeTime(doc.createdAt)}</span>
      </div>
    </Link>
  );
}
