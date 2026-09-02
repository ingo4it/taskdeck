import { NextResponse } from "next/server";
import { authed } from "@/lib/api/route";

type Params = { params: Promise<{ id: string }> };

export const GET = authed(async ({ be }, _req: Request, { params }: Params) => {
  const { id } = await params;
  return NextResponse.json(await be.documents.get(id));
});

export const DELETE = authed(async ({ be }, _req: Request, { params }: Params) => {
  const { id } = await params;
  await be.documents.remove(id);
  return new NextResponse(null, { status: 204 });
});
