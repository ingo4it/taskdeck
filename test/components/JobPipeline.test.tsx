import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobPipeline } from "@/components/jobs/JobPipeline";
import type { DocumentPipeline } from "@/lib/api/types";

// The stream hook is exercised on its own elsewhere; here we only care that the
// component renders the seeded pipeline correctly before the socket opens.
vi.mock("@/lib/realtime/useJobStream", () => ({
  useJobStream: (_id: string, initial: DocumentPipeline) => ({
    pipeline: initial,
    status: "open" as const,
    reconnect: () => {},
  }),
}));

const seed: DocumentPipeline = {
  documentId: "doc-1",
  overall: "running",
  stages: [
    {
      stage: "parse",
      state: "succeeded",
      attempt: 1,
      startedAt: null,
      finishedAt: "2026-09-10T11:59:00Z",
      error: null,
    },
    { stage: "extract", state: "running", attempt: 2, startedAt: null, finishedAt: null, error: null },
    { stage: "review", state: "pending", attempt: 0, startedAt: null, finishedAt: null, error: null },
  ],
};

describe("JobPipeline", () => {
  it("renders each stage with its state and overall badge", () => {
    render(<JobPipeline initial={seed} />);
    expect(screen.getByText("Parse")).toBeInTheDocument();
    expect(screen.getByText("Extract")).toBeInTheDocument();
    expect(screen.getByText("AI review")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument(); // overall
    expect(screen.getByText(/try 2/)).toBeInTheDocument(); // retry annotation on extract
  });
});
