"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { subscribe } from "./sse.js";
import type { DocumentPipeline, JobStage, JobStageState, JobStreamEvent } from "../api/types.js";

/**
 * Subscribes to a document's pipeline SSE stream and folds stage-transition
 * events into a live `DocumentPipeline`. Seeded with the server-rendered
 * pipeline so the UI is correct before the socket opens; the stream then keeps
 * it current. Reconnects transparently — `status` surfaces that to the UI.
 */
export type StreamStatus = "connecting" | "open" | "reconnecting" | "closed";

type Action =
  | { kind: "stage"; stage: JobStage; state: JobStageState; attempt: number }
  | { kind: "overall"; overall: DocumentPipeline["overall"] };

function reducer(state: DocumentPipeline, action: Action): DocumentPipeline {
  switch (action.kind) {
    case "stage":
      return {
        ...state,
        stages: state.stages.map((s) =>
          s.stage === action.stage
            ? { ...s, state: action.state, attempt: action.attempt }
            : s,
        ),
        overall: deriveOverall(
          state.stages.map((s) => (s.stage === action.stage ? { ...s, state: action.state } : s)),
        ),
      };
    case "overall":
      return { ...state, overall: action.overall };
  }
}

function deriveOverall(stages: DocumentPipeline["stages"]): DocumentPipeline["overall"] {
  if (stages.some((s) => s.state === "failed" || s.state === "dead")) return "failed";
  if (stages.every((s) => s.state === "succeeded")) return "done";
  if (stages.some((s) => s.state === "running")) return "running";
  return "queued";
}

export function useJobStream(documentId: string, initial: DocumentPipeline) {
  const [pipeline, dispatch] = useReducer(reducer, initial);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    void subscribe<JobStreamEvent>({
      url: `/api/documents/${documentId}/pipeline/stream`,
      signal: controller.signal,
      onStatus: setStatus,
      onMessage: (_event, payload) => {
        if (payload.type === "stage") {
          dispatch({ kind: "stage", stage: payload.stage, state: payload.state, attempt: payload.attempt });
        } else if (payload.type === "pipeline") {
          dispatch({ kind: "overall", overall: payload.overall });
        }
      },
    });

    return () => controller.abort();
  }, [documentId]);

  return { pipeline, status, reconnect: () => controllerRef.current?.abort() };
}
