import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { publicEnv } from "@/lib/env";
import type { Org, User } from "@/lib/api/types";

export function AppNav({ user, org }: { user: User; org: Org }) {
  return (
    <header className="border-b border-[var(--color-border)]">
      {publicEnv.NEXT_PUBLIC_DEMO_MODE ? (
        <div className="bg-[var(--color-accent)]/10 px-6 py-1.5 text-center text-xs text-[var(--color-accent)]">
          Demo mode — sample data, backend services simulated. Nothing here is persisted.
        </div>
      ) : null}
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-semibold">
            taskdeck
          </Link>
          <span className="text-[var(--color-muted)]">/</span>
          <span className="text-sm">{org.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--color-muted)] sm:inline">{user.displayName}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
