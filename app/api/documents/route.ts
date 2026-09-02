import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api/route";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  filename: z.string().min(1),
  byteSize: z.number().int().positive().max(50 * 1024 * 1024),
});

export const GET = authed(async ({ be }, req: NextRequest) => {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const page = await be.documents.list({ limit, cursor });
  return NextResponse.json(page);
});

export const POST = authed(async ({ be }, req: NextRequest) => {
  const body = createSchema.parse(await req.json());
  const doc = await be.documents.create(body);
  // upload accepted → kick off the parse → extract → review pipeline
  await be.pipeline.start(doc.id).catch(() => undefined);
  return NextResponse.json(doc, { status: 201 });
});
