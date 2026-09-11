import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ApiClient", () => {
  it("returns the decoded body on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { id: "doc-1" }));
    const client = new ApiClient({ service: "keystone", baseUrl: "http://x", token: "t", fetchImpl });
    await expect(client.request("/v1/documents/doc-1")).resolves.toEqual({ id: "doc-1" });
    expect(fetchImpl.mock.calls[0]![1]!.headers).toMatchObject({ authorization: "Bearer t" });
  });

  it("maps problem+json to ApiError and does not retry a 403", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(403, { title: "Insufficient scope", status: 403, code: "forbidden" }));
    const client = new ApiClient({ service: "keystone", baseUrl: "http://x", fetchImpl });
    await expect(client.request("/v1/documents")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      code: "forbidden",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 up to maxAttempts then throws", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(503, { title: "unavailable", status: 503 }));
    const client = new ApiClient({ service: "pulseq", baseUrl: "http://x", fetchImpl, maxAttempts: 3 });
    await expect(client.request("/v1/x")).rejects.toBeInstanceOf(ApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-idempotent POST", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(500, { title: "boom", status: 500 }));
    const client = new ApiClient({ service: "keystone", baseUrl: "http://x", fetchImpl });
    await expect(client.request("/v1/documents", { method: "POST", body: {} })).rejects.toBeTruthy();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
