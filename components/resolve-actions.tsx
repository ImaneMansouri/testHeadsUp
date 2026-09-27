"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { InlineError } from "@/components/inline-error";
import { Button } from "@/components/ui/button";
import { ACTION_LABELS } from "@/lib/format";
import type { ResolveAction } from "@/lib/types";

const BUTTONS: { action: ResolveAction; label: string; variant: "default" | "outline" | "success" }[] = [
  { action: "prior_auth_started", label: "Prior auth started", variant: "default" },
  { action: "switched", label: "Switched medication", variant: "outline" },
  { action: "reviewed", label: "Mark reviewed", variant: "outline" },
];

export function ResolveActions({
  id,
  status,
  action,
  onResolved,
  stacked = false,
}: {
  id: string;
  status: "open" | "resolved";
  action: ResolveAction | null;
  onResolved?: (action: ResolveAction) => void;
  stacked?: boolean;
}) {
  const [pending, setPending] = useState<ResolveAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<ResolveAction | null>(null);
  const [localAction, setLocalAction] = useState<ResolveAction | null>(null);
  const resolved = status === "resolved" || localAction !== null;
  const shown = localAction ?? action;

  async function choose(next: ResolveAction) {
    setPending(next);
    setError(null);
    setFailed(null);
    try {
      const response = await fetch(`/api/changes/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: next }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "We couldn't save that action.");
      setLocalAction(next);
      onResolved?.(next);
    } catch (err) {
      setFailed(next);
      setError(err instanceof Error ? err.message : "We couldn't save that action.");
    } finally {
      setPending(null);
    }
  }

  if (resolved) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-[#10B981]/30 bg-[#10B981]/10 px-5 py-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 16 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#10B981] text-white"
        >
          <Check className="h-8 w-8" />
        </motion.div>
        <p className="mt-3 text-lg font-extrabold text-[#047857]">Resolved ✓</p>
        {shown ? <p className="mt-1 text-sm text-[#047857]">{ACTION_LABELS[shown]}</p> : null}
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={stacked ? "flex flex-col gap-3" : "flex flex-col gap-3 sm:flex-row"}>
        {BUTTONS.map((button) => (
          <Button
            key={button.action}
            variant={button.variant}
            size={stacked ? "block" : "lg"}
            disabled={pending !== null}
            onClick={() => void choose(button.action)}
          >
            {pending === button.action ? "Saving…" : button.label}
          </Button>
        ))}
      </div>
      {error && failed ? <InlineError message={error} onRetry={() => void choose(failed)} /> : null}
    </div>
  );
}
