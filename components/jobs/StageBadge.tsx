import { Badge } from "@/components/ui/primitives";
import type { JobStageState } from "@/lib/api/types";

const label: Record<JobStageState, string> = {
  pending: "Pending",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
  dead: "Dead-lettered",
};

const tone: Record<JobStageState, "neutral" | "info" | "success" | "warning" | "danger"> = {
  pending: "neutral",
  running: "info",
  succeeded: "success",
  failed: "warning",
  dead: "danger",
};

export function StageBadge({ state, attempt }: { state: JobStageState; attempt: number }) {
  return (
    <Badge tone={tone[state]}>
      {label[state]}
      {attempt > 1 && state !== "succeeded" ? ` · try ${attempt}` : ""}
    </Badge>
  );
}
