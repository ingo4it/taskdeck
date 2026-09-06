import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-sm text-[var(--color-muted)]">That page or document doesn&apos;t exist.</p>
      <Button asChild variant="ghost">
        <Link href="/dashboard">Back to documents</Link>
      </Button>
    </main>
  );
}
