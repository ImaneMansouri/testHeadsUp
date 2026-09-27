import { createHash } from "node:crypto";
import type { Change, ChangeType, CoverageRow, Direction, Snapshot } from "./types";

const CHANGE_ORDER: ChangeType[] = [
  "removed",
  "tier_increase",
  "tier_decrease",
  "prior_authorization_added",
  "prior_authorization_removed",
  "step_therapy_added",
  "step_therapy_removed",
  "quantity_limit_added",
  "quantity_limit_removed",
];

export function makeChangeId(
  planId: string,
  rxcui: string,
  changeType: ChangeType,
  beforeSnapshotId: string,
  afterSnapshotId: string,
): string {
  return createHash("sha256")
    .update([planId, rxcui, changeType, beforeSnapshotId, afterSnapshotId].join("|"))
    .digest("hex")
    .slice(0, 16);
}

function pairKey(row: CoverageRow): string {
  return `${row.planId}|${row.rxcui}`;
}

function pushChange(
  changes: Change[],
  beforeSnap: Snapshot,
  afterSnap: Snapshot,
  before: CoverageRow,
  after: CoverageRow | null,
  changeType: ChangeType,
  direction: Direction,
) {
  changes.push({
    id: makeChangeId(before.planId, before.rxcui, changeType, beforeSnap.id, afterSnap.id),
    planId: before.planId,
    planName: before.planName,
    insurer: before.insurer,
    rxcui: before.rxcui,
    drugName: before.drugName,
    changeType,
    direction,
    before,
    after,
    evidence: {
      beforeFile: beforeSnap.sourceFile,
      afterFile: afterSnap.sourceFile,
    },
  });
}

function compareFlag(
  changes: Change[],
  beforeSnap: Snapshot,
  afterSnap: Snapshot,
  before: CoverageRow,
  after: CoverageRow,
  field: "priorAuthorization" | "stepTherapy" | "quantityLimit",
  added: ChangeType,
  removed: ChangeType,
) {
  const left = before[field];
  const right = after[field];
  if (left === null || left === undefined || right === null || right === undefined) return;
  if (left === false && right === true) {
    pushChange(changes, beforeSnap, afterSnap, before, after, added, "worsened");
  } else if (left === true && right === false) {
    pushChange(changes, beforeSnap, afterSnap, before, after, removed, "improved");
  }
}

export function compareSnapshots(before: Snapshot, after: Snapshot): Change[] {
  const afterByKey = new Map<string, CoverageRow>();
  for (const row of after.rows) afterByKey.set(pairKey(row), row);

  const changes: Change[] = [];

  for (const row of before.rows) {
    const next = afterByKey.get(pairKey(row)) ?? null;

    if (row.covered === true && (next === null || next.covered === false)) {
      pushChange(changes, before, after, row, next, "removed", "worsened");
    }

    if (!next) continue;

    if (row.tier !== null && row.tier !== undefined && next.tier !== null && next.tier !== undefined) {
      if (next.tier > row.tier) {
        pushChange(changes, before, after, row, next, "tier_increase", "worsened");
      } else if (next.tier < row.tier) {
        pushChange(changes, before, after, row, next, "tier_decrease", "improved");
      }
    }

    compareFlag(
      changes,
      before,
      after,
      row,
      next,
      "priorAuthorization",
      "prior_authorization_added",
      "prior_authorization_removed",
    );
    compareFlag(
      changes,
      before,
      after,
      row,
      next,
      "stepTherapy",
      "step_therapy_added",
      "step_therapy_removed",
    );
    compareFlag(
      changes,
      before,
      after,
      row,
      next,
      "quantityLimit",
      "quantity_limit_added",
      "quantity_limit_removed",
    );
  }

  changes.sort((a, b) => {
    const plan = a.planId.localeCompare(b.planId);
    if (plan !== 0) return plan;
    const drug = a.rxcui.localeCompare(b.rxcui);
    if (drug !== 0) return drug;
    return CHANGE_ORDER.indexOf(a.changeType) - CHANGE_ORDER.indexOf(b.changeType);
  });

  return changes;
}
