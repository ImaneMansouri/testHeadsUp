"use client";

import Link from "next/link";
import { InlineError } from "@/components/inline-error";
import { ResolveActions } from "@/components/resolve-actions";
import { usePoll } from "@/components/use-poll";
import { ChangeBadge } from "@/components/ui/badge";
import { formatBool, formatEstCost, formatTier, shortDrug } from "@/lib/format";
import type { ChangeType, CoverageRow, Direction, ResolveAction } from "@/lib/types";

type Detail = {
  change: {
    id: string;
    drugName: string;
    planName: string;
    insurer: string;
    changeType: ChangeType;
    direction: Direction;
    before: CoverageRow;
    after: CoverageRow | null;
  };
  affectedPatients: { id: string; name: string }[];
  affectedCount: number;
  explanation: string;
  explanationSource: "template" | "grok";
  status: "open" | "resolved";
  action: ResolveAction | null;
  evidence: {
    beforeFile: string;
    afterFile: string;
    beforeCapturedAt: string;
    afterCapturedAt: string;
    beforeLabel: string;
    afterLabel: string;
  };
  actionPlan: { title: string; detail: string }[];
};

export function ChangeDetail({ id }: { id: string }) {
  const query = usePoll<Detail>(id ? `/api/changes/${id}` : null, 3000);
  const detail = query.data;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6">
      <Link href="/changes" className="text-sm font-semibold text-[#3B6BFF]">
        All changes
      </Link>
      {query.error ? (
        <div className="mt-6">
          <InlineError message={query.error} onRetry={query.reload} />
        </div>
      ) : null}
      {!detail && !query.error ? <p className="mt-8 text-[#5C6B8A]">Loading this change…</p> : null}
      {detail ? (
        <div className="mt-6 space-y-8">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <ChangeBadge type={detail.change.changeType} direction={detail.change.direction} />
              <span className="rounded-full bg-[#3B6BFF]/10 px-3 py-1 text-xs font-semibold text-[#3B6BFF]">
                Real CMS data
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight">{shortDrug(detail.change.drugName)}</h1>
            <p className="mt-2 text-lg text-[#5C6B8A]">
              {detail.change.insurer} · {detail.change.planName}
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <Column
              title="Before"
              row={detail.change.before}
              tone={detail.change.direction === "worsened" ? "good" : "bad"}
            />
            <Column
              title="After"
              row={detail.change.after}
              tone={detail.change.direction === "worsened" ? "bad" : "good"}
              missing={detail.change.after === null}
            />
          </div>

          <section className="rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_10px_40px_rgba(15,26,51,0.05)]">
            <h2 className="text-xl font-extrabold">What this means</h2>
            <p className="mt-3 text-base leading-7">{detail.explanation}</p>
            <p className="mt-3 text-xs text-[#5C6B8A]">Explanations never decide coverage.</p>
            {detail.explanationSource === "grok" ? (
              <p className="mt-1 text-xs text-[#5C6B8A]">
                Wording rephrased by Grok. The coverage decision still comes from the CMS files.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#E6EAF2] bg-white p-6">
            <h2 className="text-xl font-extrabold">Evidence</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold">{detail.evidence.beforeLabel}</dt>
                <dd className="text-[#5C6B8A]">
                  {detail.evidence.beforeFile} · captured {detail.evidence.beforeCapturedAt}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">{detail.evidence.afterLabel}</dt>
                <dd className="text-[#5C6B8A]">
                  {detail.evidence.afterFile} · captured {detail.evidence.afterCapturedAt}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-xl font-extrabold">Your affected patients</h2>
            <p className="mt-1 text-xs text-[#5C6B8A]">Synthetic demo patients</p>
            {detail.affectedPatients.length === 0 ? (
              <p className="mt-3 text-sm text-[#5C6B8A]">No patients on this panel match this change.</p>
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {detail.affectedPatients.map((patient) => (
                  <li key={patient.id} className="rounded-2xl border border-[#E6EAF2] bg-white px-4 py-3 font-semibold">
                    {patient.name}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[#E6EAF2] bg-white p-6">
            <h2 className="text-xl font-extrabold">Action plan</h2>
            <ol className="mt-4 space-y-4">
              {detail.actionPlan.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0A1020] text-xs font-extrabold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-sm text-[#5C6B8A]">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <ResolveActions id={detail.change.id} status={detail.status} action={detail.action} onResolved={query.reload} />
        </div>
      ) : null}
    </div>
  );
}

function Column({
  title,
  row,
  tone,
  missing = false,
}: {
  title: string;
  row: CoverageRow | null;
  tone: "good" | "bad";
  missing?: boolean;
}) {
  const frame =
    tone === "good" ? "border-[#10B981]/40 bg-[#10B981]/5" : "border-[#F43F5E]/40 bg-[#F43F5E]/5";
  const fields: [string, string][] = missing || !row
    ? [
        ["Covered", "Not covered"],
        ["Tier", "Not covered"],
        ["Prior authorization", "Not covered"],
        ["Step therapy", "Not covered"],
        ["Quantity limit", "Not covered"],
        ["Est. monthly cost", "Not covered"],
      ]
    : [
        ["Covered", row.covered === false ? "No" : row.covered === true ? "Yes" : "Unknown"],
        ["Tier", formatTier(row.tier)],
        ["Prior authorization", formatBool(row.priorAuthorization)],
        ["Step therapy", formatBool(row.stepTherapy)],
        ["Quantity limit", formatBool(row.quantityLimit)],
        ["Est. monthly cost", row.covered === false ? "Not covered" : formatEstCost(row.estMonthlyCost)],
      ];

  return (
    <section className={`rounded-2xl border p-5 ${frame}`}>
      <h2 className="text-sm font-extrabold uppercase tracking-wider">{title}</h2>
      <dl className="mt-4 space-y-3">
        {fields.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
            <dt className="text-[#5C6B8A]">{label}</dt>
            <dd className="text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
