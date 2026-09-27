"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { InlineError } from "@/components/inline-error";
import { usePoll } from "@/components/use-poll";
import { formatEstMonthly, type ImpactReport } from "@/lib/impact";

export function ImpactStrip() {
  const impact = usePoll<ImpactReport>("/api/impact", 3000);
  const report = impact.data;

  return (
    <section aria-label="Impact summary">
      <div className="rounded-2xl border border-[#E6EAF2] bg-white p-5 shadow-[0_10px_40px_rgba(15,26,51,0.05)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xs">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B6BFF]">Impact</p>
            <p className="mt-1 text-sm leading-6 text-[#5C6B8A]">
              File math stays put. Texts and prior auths move with this demo.
            </p>
          </div>
          {report ? (
            <dl className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="Patients matched"
                value={String(report.file.patientsMatched)}
                metric="strip-patients"
              />
              <Stat
                label="Est. prior monthly cost"
                value={formatEstMonthly(report.exposure.priorMonthlyKnown)}
                metric="strip-cost"
              />
              <Stat label="Texts this session" value={String(report.session.textsSent)} metric="strip-texts" />
              <Stat
                label="Prior auths started"
                value={String(report.session.priorAuthsStarted)}
                metric="strip-prior-auths"
              />
            </dl>
          ) : (
            <p className="text-sm text-[#5C6B8A]">{impact.error ? "" : "Loading impact…"}</p>
          )}
          <Link
            href="/impact"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0A1020] px-5 text-sm font-semibold text-white hover:bg-[#111A2E]"
          >
            Open dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {impact.error ? (
          <div className="mt-4">
            <InlineError message={impact.error} onRetry={impact.reload} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value, metric }: { label: string; value: string; metric: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#5C6B8A]">{label}</dt>
      <dd className="mt-1 text-lg font-extrabold tracking-tight sm:text-2xl" data-metric={metric}>
        {value}
      </dd>
    </div>
  );
}
