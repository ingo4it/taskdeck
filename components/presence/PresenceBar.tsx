"use client";

import { usePresence } from "@/lib/realtime/usePresence";

/** Avatars for who else is viewing this document, live over WebSocket. */
export function PresenceBar({ documentId }: { documentId: string }) {
  const { peers, connected } = usePresence(documentId);
  if (peers.length === 0) return null;

  return (
    <div className="flex items-center gap-2" title={connected ? "live" : "reconnecting"}>
      <div className="flex -space-x-2">
        {peers.slice(0, 5).map((p) => (
          <span
            key={p.userId}
            className="grid size-6 place-items-center rounded-full border border-[var(--color-bg)] bg-[var(--color-accent)] text-[10px] font-semibold text-white"
            title={p.displayName}
          >
            {initials(p.displayName)}
          </span>
        ))}
      </div>
      {peers.length > 5 ? (
        <span className="text-xs text-[var(--color-muted)]">+{peers.length - 5}</span>
      ) : null}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}
