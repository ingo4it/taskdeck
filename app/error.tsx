"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // in prod this would go to the error tracker; digest correlates with server logs
    console.error("app error", error.digest, error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-[var(--color-muted)]">
        {error.message || "An unexpected error occurred."}
        {error.digest ? <span className="block text-xs">ref: {error.digest}</span> : null}
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
