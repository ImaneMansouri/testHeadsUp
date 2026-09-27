"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { InlineError } from "@/components/inline-error";
import { usePoll } from "@/components/use-poll";
import { ChangeBadge } from "@/components/ui/badge";
import { CHANGE_LABELS, directionLabel, shortDrug } from "@/lib/format";
import type { ChangeType, Direction } from "@/lib/types";

type Row = {
  id: string;
  drugName: string;
  planName: string;
  insurer: string;
  changeType: ChangeType;
  direction: Direction;
  affectedCount: number;
  status: "open" | "resolved";
};

const TYPES = Object.keys(CHANGE_LABELS) as ChangeType[];

export function ChangesBrowser() {
  const query = usePoll<{ changes: Row[] }>("/api/changes", 3000);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | ChangeType>("all");
  const [status, setStatus] = useState<"all" | "open" | "resolved">("all");

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (query.data?.changes ?? []).filter((row) => {
      if (type !== "all" && row.changeType !== type) return false;
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      return [row.drugName, row.planName, row.insurer].some((value) => value.toLowerCase().includes(needle));
    });
  }, [query.data, search, type, status]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Changes</h1>
      <p className="mt-2 max-w-2xl text-[#5C6B8A]">
        Every row is a rule-based diff of the CMS snapshots. Open one to see the patients on your panel.
      </p>
      {query.error ? (
        <div className="mt-6">
          <InlineError message={query.error} onRetry={query.reload} />
        </div>
      ) : null}
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_180px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search drug, plan, or insurer"
          className="h-11 rounded-xl border border-[#E6EAF2] bg-white px-3 text-sm"
          aria-label="Search changes"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value as "all" | ChangeType)}
          className="h-11 rounded-xl border border-[#E6EAF2] bg-white px-3 text-sm"
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          {TYPES.map((item) => (
            <option key={item} value={item}>
              {CHANGE_LABELS[item]}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "all" | "open" | "resolved")}
          className="h-11 rounded-xl border border-[#E6EAF2] bg-white px-3 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {!query.data && !query.error ? <p className="mt-8 text-sm text-[#5C6B8A]">Loading changes…</p> : null}

      {query.data && rows.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-[#E6EAF2] bg-white px-4 py-6 text-sm text-[#5C6B8A]">
          No changes match that filter.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-[#E6EAF2] bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F6F8FC] text-xs uppercase tracking-wider text-[#5C6B8A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Drug</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Direction</th>
                  <th className="px-4 py-3 font-semibold">Patients</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#E6EAF2] hover:bg-[#F6F8FC]">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/changes/${row.id}`} className="hover:text-[#3B6BFF]">
                        {shortDrug(row.drugName)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.planName}</div>
                      <div className="text-xs text-[#5C6B8A]">{row.insurer}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ChangeBadge type={row.changeType} direction={row.direction} />
                    </td>
                    <td className="px-4 py-3">{directionLabel(row.direction)}</td>
                    <td className="px-4 py-3">{row.affectedCount}</td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 space-y-3 md:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/changes/${row.id}`}
                  className="block rounded-2xl border border-[#E6EAF2] bg-white p-4 shadow-sm"
                >
                  <ChangeBadge type={row.changeType} direction={row.direction} />
                  <p className="mt-2 font-extrabold">{shortDrug(row.drugName)}</p>
                  <p className="text-sm text-[#5C6B8A]">{row.planName}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#5C6B8A]">
                    {row.affectedCount} patients · {row.status}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
