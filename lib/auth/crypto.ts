/**
 * Authenticated encryption for the session cookie. AES-256-GCM via Web Crypto
 * (available in both the Node and Edge runtimes), key derived from
 * `SESSION_SECRET` with SHA-256. Output is `base64url(iv).base64url(ciphertext)`.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function keyFrom(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function seal(plaintext: string, secret: string): Promise<string> {
  const key = await keyFrom(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  return `${b64url(iv)}.${b64url(new Uint8Array(ct))}`;
}

export async function unseal(token: string, secret: string): Promise<string | null> {
  const [ivPart, ctPart] = token.split(".");
  if (!ivPart || !ctPart) return null;
  try {
    const key = await keyFrom(secret);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64url(ivPart) },
      key,
      fromB64url(ctPart),
    );
    return decoder.decode(pt);
  } catch {
    return null; // tampered, wrong key, or truncated
  }
}

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
