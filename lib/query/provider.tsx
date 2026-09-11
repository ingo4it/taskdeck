"use client";

import { QueryClient, QueryClientProvider, isServer } from "@tanstack/react-query";
import { useState } from "react";
import { isApiError } from "../api/errors";

/**
 * One `QueryClient` per browser tab. `retry` defers to `ApiError.retryable` so
 * a 403 fails fast while a 503 is retried. Job-derived queries use a short
 * `staleTime` because the SSE stream is the real source of freshness — polling
 * is only the fallback when the stream is down.
 */
function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: !isServer,
        retry: (count, error) => (isApiError(error) ? error.retryable && count < 3 : count < 2),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

function getClient(): QueryClient {
  if (isServer) return makeClient();
  browserClient ??= makeClient();
  return browserClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(getClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
