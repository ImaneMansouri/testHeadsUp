import { affectedPatients } from "./match";
import type { Change, Doctor, Snapshot } from "./types";

export type WatchCounts = {
  plans: number;
  drugs: number;
  changes: number;
  patients: number;
  pairs: number;
};

export function watchCounts(
  before: Snapshot,
  after: Snapshot,
  changes: Change[],
  doctor: Doctor,
): WatchCounts {
  const plans = new Set<string>();
  const drugs = new Set<string>();
  const pairs = new Set<string>();
  for (const row of before.rows) {
    plans.add(row.planId);
    drugs.add(row.rxcui);
    pairs.add(`${row.planId}|${row.rxcui}`);
  }
  for (const row of after.rows) {
    plans.add(row.planId);
    drugs.add(row.rxcui);
  }
  const patients = new Set<string>();
  for (const change of changes) {
    for (const patient of affectedPatients(change, doctor)) patients.add(patient.id);
  }
  return {
    plans: plans.size,
    drugs: drugs.size,
    changes: changes.length,
    patients: patients.size,
    pairs: pairs.size,
  };
}
