import { describe, expect, it } from "vitest";
import { seal, unseal } from "@/lib/auth/crypto";

const SECRET = "a-secret-that-is-at-least-32-bytes-long!!";

describe("session crypto", () => {
  it("round-trips a payload", async () => {
    const token = await seal(JSON.stringify({ userId: "u1", org: "acme" }), SECRET);
    expect(token).toContain(".");
    expect(await unseal(token, SECRET)).toBe('{"userId":"u1","org":"acme"}');
  });

  it("returns null for a token sealed with a different key", async () => {
    const token = await seal("hello", SECRET);
    expect(await unseal(token, "a-different-secret-also-32-bytes-x")).toBeNull();
  });

  it("returns null for a tampered ciphertext", async () => {
    const token = await seal("hello", SECRET);
    const [iv, ct] = token.split(".");
    const flipped = ct!.slice(0, -2) + (ct!.endsWith("AA") ? "BB" : "AA");
    expect(await unseal(`${iv}.${flipped}`, SECRET)).toBeNull();
  });

  it("returns null for a malformed token", async () => {
    expect(await unseal("garbage", SECRET)).toBeNull();
  });
});
