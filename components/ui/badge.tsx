import type { ReactNode } from "react";
import { CHANGE_LABELS } from "@/lib/format";
import type { ChangeType, Direction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ChangeBadge({
  type,
  direction = "worsened",
}: {
  type: ChangeType;
  direction?: Direction;
}) {
  const worsened = direction === "worsened";
  return (
    <Badge
      className={
        worsened ? "bg-[#F43F5E]/10 text-[#BE123C]" : "bg-[#10B981]/15 text-[#047857]"
      }
    >
      {CHANGE_LABELS[type]}
    </Badge>
  );
}
