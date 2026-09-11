import type { Citation } from "@/lib/api/types";

/**
 * Renders the citations a modelgate answer or finding leaned on. Each is a
 * quoted span plus the source document + chunk position, so a reader can verify
 * the claim.
 */
export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <ol className="mt-2 space-y-1.5 text-xs text-[var(--color-muted)]">
      {citations.map((c, i) => (
        <li
          key={`${c.documentId}-${c.ordinal}-${i}`}
          className="border-l-2 border-[var(--color-border)] pl-2"
        >
          <span className="font-medium text-[var(--color-fg)]">[{i + 1}]</span> {c.title} · part{" "}
          {c.ordinal + 1}
          <blockquote className="mt-0.5 italic">“{c.quote}”</blockquote>
        </li>
      ))}
    </ol>
  );
}
