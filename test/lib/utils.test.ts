import { describe, expect, it } from "vitest";
import { cn, formatBytes, relativeTime } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy classes only", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("formatBytes", () => {
  it("scales units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(20 * 1024 * 1024)).toBe("20 MB");
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-09-10T12:00:00Z");
  it("formats deltas", () => {
    expect(relativeTime("2026-09-10T11:59:40Z", now)).toBe("just now");
    expect(relativeTime("2026-09-10T11:30:00Z", now)).toBe("30m ago");
    expect(relativeTime("2026-09-10T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-09-08T12:00:00Z", now)).toBe("2d ago");
  });
});
