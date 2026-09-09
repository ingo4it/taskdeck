/**
 * Demo seed. Creates an org, a user membership, and a few sample documents so
 * the app is non-empty on first run. Needs the local stack up (`docker compose
 * up -d`) and a keystone admin token.
 *
 *   KEYSTONE_URL=http://localhost:8080 KEYSTONE_ADMIN_TOKEN=... pnpm seed
 */
const KEYSTONE_URL = process.env.KEYSTONE_URL ?? "http://localhost:8080";
const ADMIN_TOKEN = process.env.KEYSTONE_ADMIN_TOKEN;

const SAMPLE_DOCS = [
  { title: "Vendor MSA", filename: "vendor-msa.pdf", byteSize: 248_100 },
  { title: "Q3 Board Deck", filename: "q3-board.pdf", byteSize: 1_820_400 },
  { title: "DPA — EU", filename: "dpa-eu.docx", byteSize: 96_500 },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${KEYSTONE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ADMIN_TOKEN}`,
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} → ${res.status}`);
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  if (!ADMIN_TOKEN) {
    console.error("set KEYSTONE_ADMIN_TOKEN (an access token with auth:admin scope)");
    process.exit(1);
  }

  const org = await api<{ id: string }>("/v1/projects", {
    method: "POST",
    body: JSON.stringify({ slug: "demo", name: "Demo Org" }),
  }).catch(() => ({ id: "existing" }));
  console.log("org:", org.id);

  for (const doc of SAMPLE_DOCS) {
    const created = await api<{ id: string }>("/v1/documents", {
      method: "POST",
      body: JSON.stringify(doc),
    });
    console.log("document:", created.id, doc.title);
  }

  console.log("seed complete — open http://localhost:3000");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
