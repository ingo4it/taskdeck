"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { backend } from "@/lib/api";
import { isApiError } from "@/lib/api/errors";

/**
 * Server actions for mutations that originate from a plain form (progressive
 * enhancement) rather than the TanStack Query hooks. Both paths hit the same
 * `backend` gateway; ADR-0002 covers why server actions here and not a separate
 * BFF.
 */
const createSchema = z.object({
  title: z.string().min(1).max(200),
  filename: z.string().min(1),
  byteSize: z.coerce.number().int().positive(),
});

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createDocument(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid upload" };

  try {
    const be = backend(session.accessToken);
    const doc = await be.documents.create(parsed.data);
    await be.pipeline.start(doc.id).catch(() => undefined);
    revalidatePath("/dashboard");
    return { ok: true, id: doc.id };
  } catch (err) {
    return { ok: false, error: isApiError(err) ? err.message : "Upload failed" };
  }
}

export async function rerunReview(documentId: string): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await backend(session.accessToken).ai.review(documentId);
    revalidatePath(`/dashboard/documents/${documentId}`);
    return { ok: true, id: documentId };
  } catch (err) {
    return { ok: false, error: isApiError(err) ? err.message : "Review failed" };
  }
}
