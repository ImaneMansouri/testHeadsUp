"use client";

import { useMemo, useState } from "react";
import { InlineError } from "@/components/inline-error";
import { usePoll } from "@/components/use-poll";
import { ChangeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChangeType, Direction } from "@/lib/types";

type Option = {
  planId: string;
  planName: string;
  insurer: string;
  rxcui: string;
  drugName: string;
};

type WatchRow = {
  id: string;
  planName: string;
  drugName: string;
  change: { id: string; changeType: ChangeType; direction: Direction; status: string } | null;
};

export function WatchForm() {
  const catalog = usePoll<{ options: Option[] }>("/api/catalog", 0);
  const watches = usePoll<{ watches: WatchRow[] }>("/api/watches", 3000);
  const [planId, setPlanId] = useState("");
  const [rxcui, setRxcui] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => catalog.data?.options ?? [], [catalog.data]);
  const plans = useMemo(() => {
    const map = new Map<string, Option>();
    for (const option of options) if (!map.has(option.planId)) map.set(option.planId, option);
    return [...map.values()];
  }, [options]);
  const drugs = options.filter((option) => option.planId === planId);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/watches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, rxcui }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "We couldn't save that watch.");
      setPlanId("");
      setRxcui("");
      watches.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save that watch.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_10px_40px_rgba(15,26,51,0.05)]">
      <h2 className="text-2xl font-extrabold tracking-tight">Add a watch</h2>
      <p className="mt-2 max-w-2xl text-sm text-[#5C6B8A]">
        Pick a plan and drug from the CMS snapshots. Heads Up already diffs every row in those files. A watch
        pins one pair so you can see whether the latest file changed it.
      </p>
      {catalog.error ? (
        <div className="mt-4">
          <InlineError message={catalog.error} onRetry={catalog.reload} />
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <label className="text-sm font-semibold">
            Plan
            <select
              value={planId}
              onChange={(event) => {
                setPlanId(event.target.value);
                setRxcui("");
              }}
              className="mt-1 h-11 w-full rounded-xl border border-[#E6EAF2] bg-[#F6F8FC] px-3 text-sm font-medium"
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.planId} value={plan.planId}>
                  {plan.planName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Drug
            <select
              value={rxcui}
              onChange={(event) => setRxcui(event.target.value)}
              disabled={!planId}
              className="mt-1 h-11 w-full rounded-xl border border-[#E6EAF2] bg-[#F6F8FC] px-3 text-sm font-medium disabled:opacity-50"
            >
              <option value="">Select a drug</option>
              {drugs.map((drug) => (
                <option key={drug.rxcui} value={drug.rxcui}>
                  {drug.drugName}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" className="self-end" disabled={!planId || !rxcui || saving}>
            {saving ? "Saving…" : "Add watch"}
          </Button>
        </form>
      )}
      {error ? (
        <div className="mt-4">
          <InlineError message={error} onRetry={() => void save()} />
        </div>
      ) : null}
      {watches.error ? (
        <div className="mt-4">
          <InlineError message={watches.error} onRetry={watches.reload} />
        </div>
      ) : null}
      <ul className="mt-5 space-y-3">
        {(watches.data?.watches ?? []).map((watch) => (
          <li
            key={watch.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F6F8FC] px-4 py-3"
          >
            <div>
              <p className="font-semibold">{watch.drugName}</p>
              <p className="text-sm text-[#5C6B8A]">{watch.planName}</p>
            </div>
            {watch.change ? (
              <a href={`/changes/${watch.change.id}`}>
                <ChangeBadge type={watch.change.changeType} direction={watch.change.direction} />
              </a>
            ) : (
              <span className="text-sm text-[#5C6B8A]">No change in the latest file</span>
            )}
          </li>
        ))}
      </ul>
      {watches.data && watches.data.watches.length === 0 ? (
        <p className="mt-4 text-sm text-[#5C6B8A]">No extra watches yet.</p>
      ) : null}
    </section>
  );
}
