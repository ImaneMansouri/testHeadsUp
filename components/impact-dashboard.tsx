"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InlineError } from "@/components/inline-error";
import { usePoll } from "@/components/use-poll";
import { formatDuration, formatEstMonthly, type ImpactReport, type TimingPoint } from "@/lib/impact";
import type { Fact } from "@/lib/types";

type ImpactPayload = ImpactReport & { externalFacts: Fact[] };

const FUNNEL_COLORS = ["#3B6BFF", "#22D3EE", "#0A1020", "#10B981"];

export function ImpactDashboard() {
  const impact = usePoll<ImpactPayload>("/api/impact", 3000);
  const report = impact.data;

  return (
    <div>
      <section className="bg-gradient-to-b from-[#0A1020] to-[#0F1A33] text-white">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-14 sm:px-6 md:pt-20">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#22D3EE]">Impact</p>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
              Live
            </span>
          </div>
          <h1 className="mt-4 max-w-4xl text-[40px] font-extrabold leading-[0.98] tracking-tight md:text-[64px]">
            The gap, measured.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            What these CMS files already show, and what changes the moment a doctor gets the text.
          </p>
          {impact.error ? (
            <div className="mt-8">
              <InlineError message={impact.error} onRetry={impact.reload} tone="dark" />
            </div>
          ) : null}
          {report ? (
            <>
              <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi
                  label="Changes in the files"
                  metric="file-changes"
                  value={report.file.changesDetected}
                  detail={`${report.file.plansAffected} plan · ${report.file.drugsAffected} drug`}
                />
                <Kpi
                  label="Patients matched"
                  metric="file-patients"
                  value={report.file.patientsMatched}
                  detail={`${report.file.doctorsInPanel} doctor in this panel`}
                />
                <Kpi
                  label="Est. prior monthly cost"
                  metric="file-cost"
                  value={report.exposure.priorMonthlyKnown}
                  money
                  className="col-span-2 lg:col-span-1"
                  detail={
                    report.exposure.unknownPatients > 0
                      ? `${report.exposure.unknownPatients} patient prices Unknown`
                      : "Prior formulary cost, not a cash price"
                  }
                />
                <Kpi
                  label="Days between CMS files"
                  metric="file-gap"
                  value={report.file.publicationGapDays}
                  detail={`${report.file.beforeCapturedAt} → ${report.file.afterCapturedAt}`}
                />
              </div>
              <p className="mt-4 text-sm text-white/55">
                {report.file.plansWatched} plans watched · {report.file.drugsWatched} drugs ·{" "}
                {report.file.pairsCompared} pairs compared. Reset demo clears the session numbers below. These file
                numbers stay.
              </p>
            </>
          ) : !impact.error ? (
            <p className="mt-10 text-white/60">Loading the impact numbers…</p>
          ) : null}
        </div>
      </section>

      {report ? (
        <div className="mx-auto max-w-6xl space-y-10 px-5 py-12 sm:px-6">
          <Comparison report={report} />
          <Session report={report} />
          <div className="grid gap-4 lg:grid-cols-2">
            <FunnelChart report={report} />
            <TimingChart timing={report.timing} />
          </div>
          <Projection report={report} />
          <Sources report={report} />
        </div>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  metric,
  value,
  detail,
  money = false,
  light = false,
  className,
}: {
  label: string;
  metric: string;
  value: number | null;
  detail?: string;
  money?: boolean;
  light?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={
        (light
          ? "rounded-2xl border border-[#E6EAF2] bg-white px-4 py-4 shadow-[0_10px_40px_rgba(15,26,51,0.05)]"
          : "rounded-2xl border border-white/10 bg-white/5 px-4 py-4") + (className ? ` ${className}` : "")
      }
    >
      <div
        className={
          light
            ? "text-3xl font-extrabold tracking-tight text-[#0A1020] sm:text-4xl"
            : "text-3xl font-extrabold tracking-tight sm:text-4xl"
        }
        data-metric={metric}
        data-value={value === null ? "unknown" : String(value)}
      >
        {value === null ? (
          "Unknown"
        ) : money ? (
          <span>
            est. $
            <CountUp value={value} kind="money" />
            <span className="text-lg font-semibold opacity-70">/mo</span>
          </span>
        ) : (
          <CountUp value={value} kind="int" />
        )}
      </div>
      <p className={light ? "mt-1 text-sm text-[#5C6B8A]" : "mt-1 text-sm text-white/65"}>{label}</p>
      {detail ? (
        <p className={light ? "mt-1 text-xs text-[#5C6B8A]" : "mt-1 text-xs text-white/45"}>{detail}</p>
      ) : null}
    </motion.div>
  );
}

function Comparison({ report }: { report: ImpactReport }) {
  const gap = report.file.publicationGapDays;
  const alerted = report.session.textsSent > 0;
  return (
    <section>
      <h2 className="text-3xl font-extrabold tracking-tight">Before vs. with Heads Up</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5C6B8A]">
        Without an alert, the only clock in this demo is the time between the two CMS files. With Heads Up, the clock
        is this session: file check, text, then a resolution. Neither number is a pharmacy wait. There are no refill
        claims here.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#F43F5E]/25 bg-white p-6 shadow-[0_10px_40px_rgba(15,26,51,0.05)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#BE123C]">Without Heads Up</p>
          <p className="mt-4 text-6xl font-extrabold tracking-tight text-[#0A1020]" data-metric="without-days">
            {gap === null ? "–" : gap}
            <span className="ml-2 text-2xl font-semibold text-[#5C6B8A]">days</span>
          </p>
          <p className="mt-3 text-lg font-semibold">Between the CMS files, with no alert in that window.</p>
          <p className="mt-3 text-sm leading-6 text-[#5C6B8A]">
            {report.file.beforeFile} ({report.file.beforeCapturedAt}) to {report.file.afterFile} (
            {report.file.afterCapturedAt}). {report.file.patientsMatched} patients match the worsened change. None of
            them are texted until this session sends one.
          </p>
        </article>
        <article className="rounded-2xl border border-[#10B981]/30 bg-white p-6 shadow-[0_10px_40px_rgba(15,26,51,0.05)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#047857]">With Heads Up</p>
          <p className="mt-4 text-6xl font-extrabold tracking-tight text-[#0A1020]" data-metric="with-alert">
            {formatDuration(report.session.msDetectionToAlert)}
          </p>
          <p className="mt-3 text-lg font-semibold">
            {alerted ? "From the file check to the doctor text." : "Text not sent this session."}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#5C6B8A]">
            Alert to resolution:{" "}
            <span className="font-semibold text-[#0A1020]" data-metric="with-resolution">
              {formatDuration(report.session.msAlertToResolution)}
            </span>
            . A blank dash means that clock has not started. It is not zero.
          </p>
        </article>
      </div>
    </section>
  );
}

function Session({ report }: { report: ImpactReport }) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">This session</h2>
          <p className="mt-2 text-sm text-[#5C6B8A]">
            {report.session.hasRun
              ? "These move when you run the watch, send the text, and start a prior auth."
              : "Run the watch on the Command Center. These four start at zero."}
          </p>
        </div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-[#3B6BFF]">
          Command Center
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi light label="Detected this session" metric="session-changes" value={report.session.changesDetected} />
        <Kpi
          light
          label="Texts sent"
          metric="session-texts"
          value={report.session.textsSent}
          detail={
            report.session.textsSent > 0 ? `${report.session.patientsAlerted} patients on the text` : undefined
          }
        />
        <Kpi light label="Doctors alerted" metric="session-doctors" value={report.session.doctorsAlerted} />
        <Kpi light label="Prior auths started" metric="session-prior-auths" value={report.session.priorAuthsStarted} />
      </div>
      <p className="mt-3 text-sm text-[#5C6B8A]">
        Also this session: {report.session.switched} switched, {report.session.reviewed} marked reviewed. Patients
        matched on the latest run: {report.session.patientsMatched}.
      </p>
    </section>
  );
}

function FunnelChart({ report }: { report: ImpactReport }) {
  return (
    <section className="rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_10px_40px_rgba(15,26,51,0.05)]">
      <h2 className="text-2xl font-extrabold tracking-tight">Session funnel</h2>
      <p className="mt-2 text-sm text-[#5C6B8A]">
        Changes detected, patients matched, doctors alerted, prior auths started. Counts from this session, so they
        reset with the demo.
      </p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={report.funnel} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "#5C6B8A", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={148}
              tick={{ fill: "#0A1020", fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(59,107,255,0.06)" }}
              formatter={(value) => [typeof value === "number" ? value : "Unknown", "Count"]}
            />
            <Bar dataKey="value" name="Count" radius={[0, 8, 8, 0]} barSize={28}>
              {report.funnel.map((step, index) => (
                <Cell key={step.key} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function TimingChart({ timing }: { timing: TimingPoint[] }) {
  const data = timing.map((point) => ({
    label: point.label,
    seconds: Math.round(point.ms / 100) / 10,
    display: formatDuration(point.ms),
  }));
  return (
    <section className="rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_10px_40px_rgba(15,26,51,0.05)]">
      <h2 className="text-2xl font-extrabold tracking-tight">Time to alert</h2>
      <p className="mt-2 text-sm text-[#5C6B8A]">
        Only clocks that have both timestamps. Unmeasured time is left off this chart. It is not drawn as zero.
      </p>
      {data.length === 0 ? (
        <div className="mt-4 grid h-72 place-items-center rounded-2xl bg-[#F6F8FC] px-6 text-center text-sm leading-6 text-[#5C6B8A]">
          Send the text to plot detection to alert. Resolve the change to plot alert to resolution.
        </div>
      ) : (
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
              <XAxis
                type="number"
                tick={{ fill: "#5C6B8A", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                unit="s"
              />
              <YAxis
                type="category"
                dataKey="label"
                width={148}
                tick={{ fill: "#0A1020", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(16,185,129,0.08)" }}
                formatter={(value, _name, item) => {
                  const display = (item?.payload as { display?: string } | undefined)?.display;
                  return [display ?? (typeof value === "number" ? `${value}s` : "–"), "Elapsed"];
                }}
              />
              <Bar dataKey="seconds" name="Elapsed" fill="#10B981" radius={[0, 8, 8, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function Projection({ report }: { report: ImpactReport }) {
  const { projection } = report;
  const rows = projection.citedDroppedRows;
  return (
    <section className="rounded-2xl border border-[#E6EAF2] bg-[#111A2E] p-6 text-white shadow-[0_10px_40px_rgba(15,26,51,0.08)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#22D3EE]">Projection, not a CMS statistic</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight">If the same prior cost applied to the cited drops</h2>
      <p
        className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl"
        data-metric="projection-total"
        data-value={projection.totalMonthly === null ? "unknown" : String(projection.totalMonthly)}
      >
        {formatEstMonthly(projection.totalMonthly)}
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
        {rows === null ? "No cited row count." : `${rows.toLocaleString("en-US")} cited dropped rows`}
        {projection.unitCost === null
          ? ""
          : ` × ${formatEstMonthly(projection.unitCost).replace("/mo", "")} prior monthly cost`}
        . Computed from this snapshot&apos;s removed-drug price and the cited count. It is not an average, and it is
        not what patients would pay in cash.
      </p>
      <ul className="mt-5 space-y-2 text-sm leading-6 text-white/75">
        {projection.assumptions.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {projection.url ? (
        <a
          href={projection.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block text-sm font-semibold text-[#22D3EE] underline-offset-2 hover:underline"
        >
          {projection.source ?? "Source"}
        </a>
      ) : null}
    </section>
  );
}

function Sources({ report }: { report: ImpactPayload }) {
  return (
    <section>
      <h2 className="text-2xl font-extrabold tracking-tight">Where the numbers come from</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#E6EAF2] bg-white p-5 text-sm leading-6 text-[#5C6B8A]">
          <h3 className="text-base font-extrabold text-[#0A1020]">Computed in this demo</h3>
          <p className="mt-2">
            Changes, plans, drugs, and the {report.file.publicationGapDays ?? "–"}-day file gap come from{" "}
            {report.file.beforeFile} and {report.file.afterFile}. Patients come from the synthetic roster. Texts,
            doctors alerted, prior auths, and the two clocks come from the same alert state as the Command Center.
          </p>
          <p className="mt-2">
            Est. prior monthly cost is the earlier file&apos;s est. monthly cost times matched patients on a removal,
            plus a known tier increase when both prices exist.{" "}
            {formatEstMonthly(report.exposure.priorMonthlyKnown)} here
            {report.exposure.unknownPatients > 0
              ? `, with ${report.exposure.unknownPatients} patient prices Unknown`
              : ""}
            . A missing price stays Unknown. It is never shown as $0.
          </p>
        </article>
        <article className="rounded-2xl border border-[#E6EAF2] bg-white p-5">
          <h3 className="text-base font-extrabold">Cited context. Not measured by Heads Up.</h3>
          <ul className="mt-3 space-y-3">
            {report.externalFacts.map((fact) => (
              <li key={fact.value + fact.label} className="text-sm leading-6">
                <span className="font-extrabold">{fact.value}</span> {fact.label}{" "}
                <a
                  href={fact.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#3B6BFF] underline-offset-2 hover:underline"
                >
                  {fact.source}
                </a>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function CountUp({ value, kind }: { value: number; kind: "int" | "money" }) {
  const motionValue = useMotionValue(0);
  const [text, setText] = useState(() => renderCount(0, kind));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: "easeOut",
      onUpdate: (latest) => setText(renderCount(latest, kind)),
      onComplete: () => setText(renderCount(value, kind)),
    });
    return () => controls.stop();
  }, [kind, motionValue, value]);

  return <span>{text}</span>;
}

function renderCount(value: number, kind: "int" | "money"): string {
  if (kind === "money") {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return Math.round(value).toLocaleString("en-US");
}
