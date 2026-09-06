import { requireSession } from "@/lib/auth/session";
import { AppNav } from "@/components/layout/AppNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen">
      <AppNav user={session.user} org={session.org} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
