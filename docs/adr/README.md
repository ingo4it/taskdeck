# Architecture decision records

Trimmed [MADR](https://adr.github.io/madr/). Decision, options weighed,
consequences.

| ADR                                                   | Title                                                                          | Status   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | -------- |
| [0001](0001-sse-vs-websocket.md)                      | SSE for one-way streams, WebSocket only where bidirectional                    | Accepted |
| [0002](0002-server-actions-vs-bff.md)                 | Route handlers + server actions, not a separate BFF service                    | Accepted |
| [0003](0003-optimistic-updates-and-reconciliation.md) | Optimistic UI with snapshot rollback; SSE as the source of truth for job state | Accepted |
