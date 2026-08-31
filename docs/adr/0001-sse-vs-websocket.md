# ADR-0001 — SSE for one-way streams, WebSocket only where bidirectional

- Status: Accepted
- Date: 2026-08-30

## Context

taskdeck has three realtime needs: job-pipeline progress, streamed AI answers,
and document presence ("who's viewing this"). The transport choice is SSE vs.
WebSocket.

## Decision

- **SSE** for job progress and AI token streams. Both are strictly
  server → client. `useJobStream` and `useAnswerStream` consume them.
- **WebSocket** for presence only, because it's genuinely bidirectional: the
  client sends `focus`/`blur`/`ping`, the server broadcasts the roster.

All three connect to **taskdeck's own route handlers**, never to keystone /
pulseq / modelgate directly.

## Rationale

- SSE is less machinery for a one-way stream: it's just an HTTP response, it
  reconnects with `Last-Event-ID` semantics, it survives proxies and HTTP/2
  multiplexing, and our `fetch`-based reader (not `EventSource`) lets us POST a
  body and send cookies. A WebSocket for a one-way feed is a second protocol to
  operate for no benefit.
- Presence *is* two-way and low-frequency, which is exactly WebSocket's sweet
  spot; doing it over SSE + a POST-per-heartbeat would be worse.
- Proxying everything through this app's routes means one auth model (the
  session cookie), one place to attach the bearer token, and the browser never
  holds an upstream credential.

## Consequences

- Two client transports to maintain, but each is small and used for one thing.
- SSE has a per-connection cost on the Node server that proxies it; long-lived
  pipeline streams are cheap (mostly idle) and the abort signal tears the
  upstream down when the tab closes.
- The presence WS gateway is a separate origin, so it can't read the session
  cookie — hence the short-lived signed ticket minted by
  `/api/documents/[id]/presence-ticket`.
