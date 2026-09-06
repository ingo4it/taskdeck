import { requireSession } from "@/lib/auth/session";
import { backend } from "@/lib/api";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { EmptyState } from "@/components/ui/primitives";
import { isApiError } from "@/lib/api/errors";

export default async function DashboardPage() {
  const session = await requireSession();

  try {
    const initial = await backend(session.accessToken).documents.list({ limit: 20 });
    return <DocumentsView initial={initial} />;
  } catch (err) {
    return (
      <EmptyState
        title="Documents are unavailable"
        hint={isApiError(err) ? `${err.service}: ${err.message}` : "Try again in a moment."}
      />
    );
  }
}
