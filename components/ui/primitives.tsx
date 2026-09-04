import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4", className)}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "info" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-black/5 text-[var(--color-muted)] dark:bg-white/10",
    info: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    success: "bg-green-500/15 text-green-600 dark:text-green-300",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    danger: "bg-red-500/15 text-red-600 dark:text-red-300",
  } as const;
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-black/10 dark:bg-white/10", className)} aria-hidden />;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
      <p className="font-medium">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-[var(--color-muted)]">{hint}</p> : null}
      {action}
    </div>
  );
}
