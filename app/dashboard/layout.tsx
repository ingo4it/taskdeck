import { requireSession } from "@/lib/auth/session";
import { AppNav } from "@/components/layout/AppNav";

// Everything under /dashboard is per-user, cookie-gated content backed by a
// live keystone call — there's nothing here that's safe or useful to
// prerender at build time. Forcing dynamic rendering also means the route
// segment config, not an accidental static-generation attempt, is what
// decides this — the server env vars (KEYSTONE_URL, SESSION_SECRET, ...)
// only need to exist at request time, matching how they're actually
// supplied (runtime container env, not build args).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen">
      <AppNav user={session.user} org={session.org} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
