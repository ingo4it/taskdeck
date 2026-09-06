"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-9" aria-hidden />;

  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <Button variant="ghost" size="sm" aria-label={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
      {resolvedTheme === "dark" ? "☾" : "☀"}
    </Button>
  );
}
