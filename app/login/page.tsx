import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { Button } from "@/components/ui/button";

// Checks the session cookie on every request to redirect already-signed-in
// users straight to /dashboard — not something a static build can decide.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (await getSession()) redirect("/dashboard");
  const { error, next } = await searchParams;
  const demo = serverEnv().DEMO_MODE;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">taskdeck</h1>
        <p className="mt-1 text-[var(--color-muted)]">
          Sign in to upload documents and run AI-assisted review.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
          Sign-in failed: {error}
        </p>
      ) : null}

      {demo ? (
        <>
          <Button asChild size="lg">
            <Link href="/api/auth/demo-login">Try the live demo</Link>
          </Button>
          <p className="text-xs text-[var(--color-muted)]">
            This deployment runs standalone: keystone, pulseq, and modelgate are simulated with realistic
            fixture data instead of live services, so there&apos;s nothing to sign in against for real. In a
            real deployment this screen hands off to keystone for OIDC + PKCE login — see{" "}
            <a
              className="underline underline-offset-2"
              href="https://github.com/ingo4it/keystone"
              target="_blank"
              rel="noreferrer"
            >
              keystone
            </a>
            .
          </p>
        </>
      ) : (
        <>
          <Button asChild size="lg">
            <Link href={`/api/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
              Continue with your organization
            </Link>
          </Button>
          <p className="text-xs text-[var(--color-muted)]">
            Authentication is handled by keystone (OIDC + PKCE). taskdeck never sees your password.
          </p>
        </>
      )}
    </main>
  );
}
