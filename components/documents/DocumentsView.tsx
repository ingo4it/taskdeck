"use client";

import { useDocuments } from "@/lib/query/documents";
import { DocumentCard } from "./DocumentCard";
import { UploadForm } from "./UploadForm";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { isApiError } from "@/lib/api/errors";
import type { Document, Page } from "@/lib/api/types";

/**
 * The documents list. Hydrated from `initial` (server-fetched first page) so
 * there's no loading flash, then TanStack Query owns it: infinite pagination,
 * optimistic upload rows from `UploadForm`, background refetch.
 */
export function DocumentsView({ initial }: { initial: Page<Document> }) {
  const q = useDocuments();
  const pages = q.data?.pages ?? [initial];
  const docs = pages.flatMap((p) => p.data);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Documents</h1>
        <UploadForm />
      </div>

      {q.isError ? (
        <EmptyState
          title="Couldn't load documents"
          hint={isApiError(q.error) ? q.error.message : "Something went wrong."}
          action={<Button variant="ghost" onClick={() => void q.refetch()}>Retry</Button>}
        />
      ) : docs.length === 0 && !q.isLoading ? (
        <EmptyState title="No documents yet" hint="Upload a PDF or Word doc to start a review." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {docs.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
            {q.isLoading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : null}
          </div>

          {q.hasNextPage ? (
            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                {q.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
