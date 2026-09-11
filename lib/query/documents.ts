"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Document, Page } from "../api/types";
import { ApiError } from "../api/errors";

/**
 * Client hooks over taskdeck's own `/api/documents*` routes (which proxy
 * keystone with the session). Mutations are optimistic with rollback:
 * `useUploadDocument` inserts a placeholder immediately, `useDeleteDocument`
 * removes the row before the request resolves, and both snapshot the cache so a
 * failure restores it.
 */
export const documentKeys = {
  all: ["documents"] as const,
  list: () => [...documentKeys.all, "list"] as const,
  detail: (id: string) => [...documentKeys.all, "detail", id] as const,
};

async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { title?: string; status?: number; code?: string };
    throw new ApiError("taskdeck", {
      title: body.title ?? res.statusText,
      status: body.status ?? res.status,
      code: body.code,
    });
  }
  return (await res.json()) as T;
}

export function useDocuments() {
  return useInfiniteQuery({
    queryKey: documentKeys.list(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      json<Page<Document>>(`/api/documents?limit=20${pageParam ? `&cursor=${pageParam}` : ""}`),
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
  });
}

export function useDocument(id: string, initialData?: Document) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => json<Document>(`/api/documents/${id}`),
    initialData,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; filename: string; byteSize: number }) =>
      json<Document>("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: documentKeys.list() });
      const snapshot = qc.getQueryData(documentKeys.list());
      const optimistic: Document = {
        id: `optimistic-${crypto.randomUUID()}`,
        orgId: "",
        title: input.title,
        filename: input.filename,
        byteSize: input.byteSize,
        status: "uploaded",
        pageCount: null,
        uploadedBy: "you",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData(
        documentKeys.list(),
        (old: { pages: Page<Document>[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [{ ...first!, data: [optimistic, ...first!.data] }, ...rest],
          };
        },
      );
      return { snapshot, optimisticId: optimistic.id };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(documentKeys.list(), ctx.snapshot);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.list() });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => json<void>(`/api/documents/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: documentKeys.list() });
      const snapshot = qc.getQueryData(documentKeys.list());
      qc.setQueryData(
        documentKeys.list(),
        (old: { pages: Page<Document>[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({ ...p, data: p.data.filter((d) => d.id !== id) })),
          };
        },
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(documentKeys.list(), ctx.snapshot);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: documentKeys.list() });
    },
  });
}
