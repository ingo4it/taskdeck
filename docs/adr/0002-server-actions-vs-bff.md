# ADR-0002 — Route handlers + server actions, not a separate BFF service

- Status: Accepted
- Date: 2026-09-01

## Context

The browser needs an authenticated, aggregated view over three services
(keystone, pulseq, modelgate). Options:

1. **A dedicated BFF** — a separate Node/Fastify service that fronts the three.
2. **Next.js route handlers + server actions** — the app's own server layer
   plays the BFF role.

## Decision

Use **Next.js route handlers and server actions** as the backend-for-frontend.
`lib/api/backend(token)` is the single typed gateway; route handlers use it for
anything the client hooks need to `fetch`, server actions use it for
form-driven mutations. The browser only ever talks to `/api/*` and server
actions.

## Rationale

- **One deployable.** A BFF is another service to build, deploy (via
  `groundwork`), monitor, and version. For an app this size the Next server
  already runs where a BFF would.
- **Types end to end.** `backend()` returns typed methods; route handlers and
  server components share those types with the client with no codegen step.
- **Auth in one place.** The session cookie is read server-side in `authed()`
  and `requireSession()`; the keystone bearer token is attached there and
  nowhere else.
- **Streaming passthrough is trivial.** A route handler can return the upstream
  `ReadableStream` directly (see the pipeline / ask routes) — no buffering, no
  re-framing.

## Consequences

- Backend logic is coupled to Next's runtime. If a non-web client (mobile, CLI)
  ever needs the same aggregation, that's the point to extract a real BFF —
  `lib/api/` is already the seam.
- Server actions and route handlers overlap; the rule is: **route handler** if
  the client needs to call it from JS (hooks, streams), **server action** if it
  comes from a `<form>` and wants progressive enhancement.
- Route handlers run on the Node runtime (not Edge) because they open long-lived
  SSE connections and use Node crypto.
