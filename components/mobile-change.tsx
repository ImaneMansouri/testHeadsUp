"use client";

import { BellRing } from "lucide-react";
import Link from "next/link";
import { InlineError } from "@/components/inline-error";
import { ResolveActions } from "@/components/resolve-actions";
import { usePoll } from "@/components/use-poll";
import { coverageSummary, shortDrug, CHANGE_LABELS } from "@/lib/format";
import type { ChangeType, CoverageRow, Direction, ResolveAction } from "@/lib/types";

type Detail = {
  change: {
    id: string;
    drugName: string;
    planName: string;
    changeType: ChangeType;
    direction: Direction;
    before: CoverageRow;
    after: CoverageRow | null;
  };
  status: "open" | "resolved";
  action: ResolveAction | null;
};

export function MobileChange({ id }: { id: string }) {
  const query = usePoll<Detail>(id ? `/api/changes/${id}?names=0` : null, 3000);
  const detail = query.data;
  const worsened = detail?.change.direction !== "improved";

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      <header className="flex items-center gap-2 bg-[#0A1020] px-4 py-3 text-white">
        <BellRing className="h-4 w-4 text-[#22D3EE]" />
        <span className="font-extrabold tracking-tight">Heads Up</span>
      </header>
      {query.error ? (
        <div className="p-4">
          <InlineError message={query.error} onRetry={query.reload} />
        </div>
      ) : null}
      {!detail && !query.error ? <p className="p-6 text-sm text-[#5C6B8A]">Loading the alert…</p> : null}
      {detail ? (
        <>
          <div className={worsened ? "bg-[#F43F5E] px-5 py-7 text-white" : "bg-[#10B981] px-5 py-7 text-white"}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              {CHANGE_LABELS[detail.change.changeType]}
            </p>
            <h1 className="mt-2 text-[34px] font-extrabold leading-[1.05] tracking-tight">
              {shortDrug(detail.change.drugName)}
            </h1>
            <p className="mt-2 text-sm text-white/90">{detail.change.planName}</p>
          </div>
          <div className="space-y-3 px-4 py-5">
            <Compare
              label="Before"
              value={coverageSummary(detail.change.before)}
              tone={worsened ? "good" : "bad"}
            />
            <Compare
              label="After"
              value={coverageSummary(
                detail.change.after,
                detail.change.changeType === "removed" || detail.change.after?.covered === false,
              )}
              tone={worsened ? "bad" : "good"}
            />
            <div className="pt-3">
              <ResolveActions
                id={detail.change.id}
                status={detail.status}
                action={detail.action}
                stacked
                onResolved={query.reload}
              />
            </div>
            <Link href={`/changes/${detail.change.id}`} className="block pt-2 text-center text-sm font-semibold text-[#3B6BFF]">
              Open the full doctor view
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Compare({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" }) {
  const frame = tone === "good" ? "border-[#10B981]/40" : "border-[#F43F5E]/40";
  return (
    <div className={`rounded-2xl border bg-white px-4 py-4 ${frame}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6B8A]">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}
