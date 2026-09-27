"use client";

import { Check, Database, MessageSquare, Radar, ShieldCheck, UserRoundX } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GapTimeline, type GapPhase } from "@/components/gap-timeline";
import { InlineError } from "@/components/inline-error";
import { PhoneMock, playNotifyTone, type PhonePhase } from "@/components/phone-mock";
import { SnapshotChart } from "@/components/snapshot-chart";
import { usePoll } from "@/components/use-poll";
import { WatchForm } from "@/components/watch-form";
import { WaveDivider } from "@/components/wave-divider";
import { ChangeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { coverageSummary, shortDrug, sourceChip } from "@/lib/format";
import type { Change, CoverageRow, Fact, ResolveAction, WatchStep } from "@/lib/types";

type Featured = Change & {
  affectedCount: number;
  status: "open" | "resolved";
  action: ResolveAction | null;
  notified: boolean;
  smsBody: string | null;
  smsMode: "preview" | "twilio" | null;
  before: CoverageRow;
  after: CoverageRow | null;
};

type ChangesPayload = {
  hasRun: boolean;
  counts: { plans: number; drugs: number; changes: number; patients: number };
  chart: { label: string; rows: number }[];
  changes: Featured[];
};

type RunRecord = {
  id: string;
  startedAt: string;
  steps: WatchStep[];
  changeCount: number;
  patientCount: number;
};

type Delivery = {
  body: string;
  sent: boolean;
  mode?: "preview" | "twilio";
  toMasked: string;
};

const TRUST = [
  {
    icon: Database,
    title: "Real CMS data",
    body: "The watch reads dated CMS Part D formulary files. The Kaiser NovoLog removal is a row that disappeared between the Q2 and September releases.",
  },
  {
    icon: ShieldCheck,
    title: "No AI decisions",
    body: "Coverage is a deterministic diff: removed, tier, prior authorization, step therapy, quantity limit. A model never decides what is covered.",
  },
  {
    icon: UserRoundX,
    title: "No patient names in texts",
    body: "The SMS names the plan, the drug, and a count. Names stay on this doctor view.",
  },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function CommandCenter({ facts, doctorName }: { facts: Fact[]; doctorName: string }) {
  const changes = usePoll<ChangesPayload>("/api/changes", 3000);
  const runs = usePoll<{ runs: RunRecord[] }>("/api/runs", 3000);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<WatchStep[]>([]);
  const [finalLine, setFinalLine] = useState(false);
  const [finalCount, setFinalCount] = useState<number | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [overrideNotified, setOverrideNotified] = useState(false);
  const [phoneOverride, setPhoneOverride] = useState<PhonePhase | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const pendingScroll = useRef(false);
  const pendingLogScroll = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const featured = changes.data?.changes.find((change) => change.direction === "worsened");
  const hasRun = Boolean(changes.data?.hasRun);
  const phase: GapPhase =
    featured?.status === "resolved" ? "resolved" : overrideNotified || featured?.notified ? "alerted" : "idle";

  const deliveryView: Delivery | null =
    delivery ??
    (featured?.smsBody
      ? {
          body: featured.smsBody,
          sent: featured.smsMode === "twilio",
          mode: featured.smsMode ?? "preview",
          toMasked: "",
        }
      : null);
  const phonePhase: PhonePhase = phoneOverride ?? (deliveryView ? "message" : "lock");

  useEffect(() => {
    if (!pendingScroll.current || !changes.data?.hasRun) return;
    pendingScroll.current = false;
    document.getElementById("alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [changes.data]);

  useEffect(() => {
    if (!pendingLogScroll.current) return;
    pendingLogScroll.current = false;
    document.getElementById("run-log")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [started, running]);

  const history = runs.data?.runs ?? [];
  const stepsToShow = running || visibleSteps.length > 0 ? visibleSteps : (history[0]?.steps ?? []);
  const showFinal = running ? finalLine : finalLine || (history.length > 0 && visibleSteps.length === 0);
  const showTerminal = running || started || history.length > 0;
  const detected = finalCount ?? history[0]?.changeCount ?? 0;

  async function runWatch() {
    setRunning(true);
    setStarted(true);
    pendingLogScroll.current = true;
    setRunError(null);
    setVisibleSteps([]);
    setFinalLine(false);
    setFinalCount(null);
    try {
      const response = await fetch("/api/watch/run", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        steps?: WatchStep[];
        changes?: unknown[];
      };
      if (!response.ok || !payload.steps) {
        throw new Error(payload.error || "The watch couldn't finish. Try again.");
      }
      for (let index = 0; index < payload.steps.length; index += 1) {
        await wait(600);
        if (!mounted.current) return;
        setVisibleSteps(payload.steps.slice(0, index + 1));
      }
      await wait(450);
      if (!mounted.current) return;
      setFinalLine(true);
      setFinalCount(payload.changes?.length ?? 0);
      pendingScroll.current = true;
      changes.reload();
      runs.reload();
    } catch (error) {
      if (!mounted.current) return;
      setRunError(error instanceof Error ? error.message : "The watch couldn't finish. Try again.");
    } finally {
      if (mounted.current) setRunning(false);
    }
  }

  async function sendText() {
    if (!featured) return;
    setSending(true);
    setSendError(null);
    setPhoneOverride("typing");
    try {
      const [response] = await Promise.all([
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changeId: featured.id }),
        }),
        wait(1000),
      ]);
      const payload = (await response.json().catch(() => ({}))) as Delivery & { error?: string };
      if (!response.ok) throw new Error(payload.error || "We couldn't send that text.");
      if (!(payload.sent || payload.mode === "preview") || !payload.body) {
        throw new Error(payload.error || "The text didn't go out.");
      }
      setDelivery({
        body: payload.body,
        sent: Boolean(payload.sent),
        mode: payload.mode,
        toMasked: payload.toMasked,
      });
      setPhoneOverride("message");
      setOverrideNotified(true);
      if (soundOn) playNotifyTone();
      changes.reload();
    } catch (error) {
      setPhoneOverride(null);
      setSendError(error instanceof Error ? error.message : "We couldn't send that text.");
    } finally {
      setSending(false);
    }
  }

  const counts = changes.data?.counts;
  const stats = [
    { label: "Plans watched", value: counts?.plans ?? 0 },
    { label: "Drugs watched", value: counts?.drugs ?? 0 },
    { label: "Changes detected", value: counts?.changes ?? 0 },
    { label: "Your patients affected", value: counts?.patients ?? 0 },
  ];

  return (
    <div>
      <section className="bg-gradient-to-b from-[#0A1020] to-[#0F1A33] text-white">
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-14 sm:px-6 md:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#22D3EE]">A coverage watch for physicians</p>
          <h1 className="mt-4 max-w-4xl text-[48px] font-extrabold leading-[0.98] tracking-tight md:text-[64px]">
            Insurance rules change. Now doctors know.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Heads Up watches plan data and texts you when a change affects your patients.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="text-4xl font-extrabold tracking-tight">
                  {hasRun ? <CountUp value={stat.value} /> : "–"}
                </div>
                <p className="mt-1 text-sm text-white/65">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={() => void runWatch()} disabled={running} aria-busy={running}>
              <Radar className={running ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
              {running ? "Running watch…" : "Run watch now"}
            </Button>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
              Live
            </span>
          </div>
          {changes.error ? (
            <div className="mt-6">
              <InlineError message={changes.error} onRetry={changes.reload} tone="dark" />
            </div>
          ) : null}
        </div>
      </section>

      <div className="bg-[#0F1A33] lg:sticky lg:top-16 lg:z-40 lg:border-b lg:border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-5">
          <GapTimeline phase={phase} />
        </div>
      </div>
      <WaveDivider />

      <div className="mx-auto max-w-6xl space-y-16 px-5 py-14 sm:px-6">
        {showTerminal ? (
          <section id="run-log">
            <div className="overflow-hidden rounded-2xl border border-[#3B6BFF]/35 bg-[#111A2E] shadow-[0_0_48px_rgba(59,107,255,0.16)]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F43F5E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <span className="ml-2 font-mono text-xs text-white/50">heads-up — watch</span>
              </div>
              <div className="min-h-52 space-y-3 p-5 font-mono text-[13px] leading-relaxed text-white/85" aria-live="polite">
                <p className="text-white/40">$ heads-up watch</p>
                {stepsToShow.map((step) => (
                  <div key={step.label} className="flex items-start justify-between gap-4">
                    <span className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                      <span>{step.label}</span>
                    </span>
                    <span className="shrink-0 text-white/35">{step.ms}ms</span>
                  </div>
                ))}
                {showFinal ? (
                  <p className="text-[#34D399]">
                    {detected > 0
                      ? `Change detected. Alerting ${doctorName}.`
                      : "No change detected."}
                  </p>
                ) : null}
                {running ? <span className="term-cursor text-[#22D3EE]">▍</span> : null}
              </div>
            </div>
            {runError ? (
              <div className="mt-4">
                <InlineError message={runError} onRetry={() => void runWatch()} />
              </div>
            ) : null}
            {history.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-[#E6EAF2] bg-white p-4">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#5C6B8A]">Watch history</h2>
                <ul className="mt-3 divide-y divide-[#E6EAF2]">
                  {history.map((run) => (
                    <li key={run.id}>
                      <details className="group py-2">
                        <summary className="cursor-pointer text-sm font-semibold">
                          {new Date(run.startedAt).toLocaleString()} · {run.changeCount} changes · {run.patientCount}{" "}
                          patients
                        </summary>
                        <ul className="mt-2 space-y-1 pl-4 font-mono text-xs text-[#5C6B8A]">
                          {run.steps.map((step) => (
                            <li key={step.label}>
                              {step.label} · {step.ms}ms
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {runs.error ? (
              <div className="mt-4">
                <InlineError message={runs.error} onRetry={runs.reload} />
              </div>
            ) : null}
          </section>
        ) : null}

        {hasRun && featured ? (
          <section id="alert" className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <article className="rounded-2xl border border-[#E6EAF2] border-l-4 border-l-[#F43F5E] bg-white p-6 shadow-[0_10px_40px_rgba(15,26,51,0.06)] sm:p-8">
              <ChangeBadge type={featured.changeType} direction={featured.direction} />
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight">{shortDrug(featured.drugName)}</h2>
              <p className="mt-1 text-[#5C6B8A]">{featured.planName}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold">
                <span className="rounded-xl bg-[#10B981]/10 px-3 py-2 text-[#047857]">
                  {coverageSummary(featured.before)}
                </span>
                <span className="text-[#5C6B8A]">→</span>
                <span className="rounded-xl bg-[#F43F5E]/10 px-3 py-2 text-[#BE123C]">
                  {coverageSummary(featured.after, featured.changeType === "removed" || featured.after?.covered === false)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#F6F8FC] px-3 py-1 text-xs font-semibold text-[#3B6BFF]">
                  {sourceChip(featured.evidence.afterFile)}
                </span>
                {featured.status === "resolved" ? (
                  <span className="rounded-full bg-[#10B981]/15 px-3 py-1 text-xs font-semibold text-[#047857]">
                    Resolved
                  </span>
                ) : null}
              </div>
              <p className="mt-5 text-lg font-extrabold">{featured.affectedCount} of your patients affected</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" asChild>
                  <Link href={`/changes/${featured.id}`}>View details</Link>
                </Button>
                <Button onClick={() => void sendText()} disabled={sending}>
                  <MessageSquare className="h-4 w-4" />
                  {sending ? "Sending…" : "Send text to doctor"}
                </Button>
              </div>
              {sendError ? (
                <div className="mt-4">
                  <InlineError message={sendError} onRetry={() => void sendText()} />
                </div>
              ) : null}
            </article>
            <PhoneMock
              phase={phonePhase}
              body={deliveryView?.body ?? null}
              sent={Boolean(deliveryView?.sent)}
              mode={deliveryView?.mode}
              toMasked={deliveryView?.toMasked}
              soundOn={soundOn}
              onToggleSound={() => setSoundOn((value) => !value)}
            />
          </section>
        ) : null}

        <section>
          <h2 className="text-3xl font-extrabold tracking-tight">Why trust it</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {TRUST.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_10px_40px_rgba(15,26,51,0.05)]"
              >
                <item.icon className="h-6 w-6 text-[#3B6BFF]" />
                <h3 className="mt-4 text-xl font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5C6B8A]">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_10px_40px_rgba(15,26,51,0.05)]">
          <h2 className="text-2xl font-extrabold tracking-tight">Rows in the watched snapshots</h2>
          <p className="mt-2 text-sm text-[#5C6B8A]">
            Formulary rows in the two CMS files this demo watches. The Georgia-wide drop is cited separately below.
          </p>
          <div className="mt-4">
            <SnapshotChart data={changes.data?.chart ?? []} />
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-extrabold tracking-tight">The problem</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {facts.map((fact) => (
              <article
                key={fact.value + fact.label}
                className="rounded-2xl border border-[#E6EAF2] bg-white p-5 shadow-[0_10px_40px_rgba(15,26,51,0.05)]"
              >
                <p className="text-4xl font-extrabold tracking-tight text-[#3B6BFF]">{fact.value}</p>
                <p className="mt-3 text-sm leading-6 text-[#0A1020]">{fact.label}</p>
                <a
                  href={fact.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-xs font-semibold text-[#3B6BFF] underline-offset-2 hover:underline"
                >
                  {fact.source}
                </a>
              </article>
            ))}
          </div>
        </section>

        <WatchForm />
      </div>
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}</>;
}
