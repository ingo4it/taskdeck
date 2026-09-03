# ADR-0003 — Optimistic UI with snapshot rollback; SSE as the source of truth for job state

- Status: Accepted
- Date: 2026-09-03

## Context

Two kinds of state change need a UI strategy:

1. **User mutations** — upload a document, delete one. The user expects instant
   feedback.
2. **Job state** — the parse → extract → review pipeline advances on its own,
   over seconds to minutes.

## Decision

**Mutations: optimistic with snapshot rollback.** In the TanStack Query
mutation, `onMutate` cancels in-flight list queries, snapshots the cache,
applies the change locally (a placeholder row for upload, a filtered list for
delete). `onError` restores the snapshot; `onSettled`/`onSuccess` invalidates so
the server's version wins.

**Job state: the SSE stream is authoritative, not the query.** The document page
server-renders the current pipeline, and `useJobStream` folds stage-transition
events into it via a reducer. The React Query entry for the pipeline has a short
`staleTime` and only polls as a fallback when the stream is down.

## Rationale

- Optimistic updates make the app feel immediate; the snapshot makes a failed
  mutation a non-event (the row just reverts) instead of a broken UI.
- Job state changes are *pushed* — modelling them as a query you poll would
  either lag or hammer the server. The stream already carries every transition;
  the reducer is the single place they're applied, so the derived "overall"
  status can't drift.
- Seeding the reducer from a server render means the pipeline is correct on
  first paint, before the socket opens — no flash of "loading".

## Consequences

- The optimistic document row carries an `optimistic-` id; the card disables its
  link and shows "uploading…" until reconciliation replaces it. Components must
  handle that transient shape.
- If the SSE stream and a background refetch disagree, the stream wins for
  `overall`/stage state and the refetch wins for everything else (title, page
  count). That split is deliberate and documented in `useJobStream`.
- Reconnect gaps can miss a transition; the stream sends a `pipeline` snapshot
  event on connect so the reducer resyncs.
