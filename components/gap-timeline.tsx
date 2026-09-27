"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BellOff, BellRing, Check, Pill, ScrollText } from "lucide-react";
import type { ReactNode } from "react";

export type GapPhase = "idle" | "alerted" | "resolved";

const copy: Record<GapPhase, string> = {
  idle: "Nothing tells the doctor. The patient hears it at the counter.",
  alerted: "The text lands with the doctor, before the refill.",
  resolved: "The doctor acted. The counter is no longer the first to know.",
};

export function GapTimeline({ phase }: { phase: GapPhase }) {
  const reduce = useReducedMotion();
  const traveled = phase === "idle" ? "0%" : "50%";
  const duration = reduce ? 0 : 1.15;

  return (
    <section aria-label="The notification gap" className="mx-auto w-full max-w-4xl">
      <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#22D3EE]">
        The gap
      </p>
      <div className="relative">
        <div className="absolute left-[16.67%] right-[16.67%] top-7 h-[2px] sm:top-8">
          <div className="absolute inset-0 rounded-full bg-white/15" />
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#3B6BFF] to-[#22D3EE]"
            initial={false}
            animate={{ width: traveled }}
            transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
          />
          {phase !== "idle" ? (
            <motion.span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22D3EE] shadow-[0_0_18px_#22D3EE]"
              initial={{ left: "0%", opacity: 0 }}
              animate={{ left: traveled, opacity: phase === "resolved" ? 0 : 1 }}
              transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}
        </div>
        <ol className="relative grid grid-cols-3 gap-2">
          <Node
            index="1"
            icon={<ScrollText className="h-5 w-5" />}
            title="Plan changes the rule"
            tone="blue"
          />
          <Node
            index="2"
            icon={
              phase === "resolved" ? (
                <Check className="h-5 w-5" />
              ) : phase === "alerted" ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <BellOff className="h-5 w-5" />
              )
            }
            title={
              phase === "resolved" ? "Resolved" : phase === "alerted" ? "Alerted by text" : "No notification"
            }
            tone={phase === "resolved" ? "green" : phase === "alerted" ? "blue" : "muted"}
          />
          <Node
            index="3"
            icon={<Pill className="h-5 w-5" />}
            title={phase === "idle" ? "Patient finds out here" : "Before the counter"}
            tone={phase === "idle" ? "danger" : "muted"}
          />
        </ol>
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-sm text-white/70 md:text-base">{copy[phase]}</p>
    </section>
  );
}

function Node({
  index,
  icon,
  title,
  tone,
}: {
  index: string;
  icon: ReactNode;
  title: string;
  tone: "blue" | "green" | "danger" | "muted";
}) {
  const circle =
    tone === "blue"
      ? "bg-[#3B6BFF] text-white shadow-[0_0_24px_rgba(59,107,255,0.55)]"
      : tone === "green"
        ? "bg-[#10B981] text-white shadow-[0_0_24px_rgba(16,185,129,0.55)]"
        : tone === "danger"
          ? "danger-ring bg-[#F43F5E] text-white"
          : "border border-white/15 bg-white/5 text-white/45";

  const label = tone === "danger" ? "text-[#FB7185]" : tone === "muted" ? "text-white/55" : "text-white";

  return (
    <li className="flex flex-col items-center text-center">
      <motion.div
        layout
        className={`relative z-10 grid h-14 w-14 place-items-center rounded-full sm:h-16 sm:w-16 ${circle}`}
        initial={false}
        animate={{ scale: tone === "muted" ? 0.96 : 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {icon}
      </motion.div>
      <span className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">0{index}</span>
      <span className={`mt-1 max-w-[9.5rem] text-xs font-semibold leading-tight sm:max-w-[12rem] sm:text-sm ${label}`}>
        {title}
      </span>
    </li>
  );
}
