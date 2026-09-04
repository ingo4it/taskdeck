import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal `asChild` slot: merges the given props (and className) onto a single
 * child element. Avoids pulling in @radix-ui just for `<Button asChild>`.
 */
export function Slot({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  if (!isValidElement(children)) return null;
  const child = children as React.ReactElement<Record<string, unknown>>;
  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, child.props.className as string | undefined),
  });
}
