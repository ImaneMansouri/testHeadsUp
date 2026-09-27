import doctorJson from "@/data/doctor.json";
import factsJson from "@/data/facts.json";
import snapshotsJson from "@/data/snapshots.json";
import type { CoverageRow, Doctor, Fact, Snapshot } from "./types";

type SnapshotFile = {
  before: Snapshot;
  after: Snapshot;
};

export function getSnapshots(): { before: Snapshot; after: Snapshot } {
  return snapshotsJson as SnapshotFile;
}

export function getDoctor(): Doctor {
  return doctorJson as Doctor;
}

export function getFacts(): Fact[] {
  return factsJson as Fact[];
}

export type CatalogOption = {
  planId: string;
  planName: string;
  insurer: string;
  rxcui: string;
  drugName: string;
};

export function catalogOptions(): CatalogOption[] {
  const { before, after } = getSnapshots();
  const map = new Map<string, CatalogOption>();
  const add = (row: CoverageRow) => {
    const key = `${row.planId}|${row.rxcui}`;
    if (!map.has(key)) {
      map.set(key, {
        planId: row.planId,
        planName: row.planName,
        insurer: row.insurer,
        rxcui: row.rxcui,
        drugName: row.drugName,
      });
    }
  };
  for (const row of before.rows) add(row);
  for (const row of after.rows) add(row);
  return [...map.values()].sort((a, b) => {
    const plan = a.planName.localeCompare(b.planName);
    if (plan !== 0) return plan;
    return a.drugName.localeCompare(b.drugName);
  });
}
