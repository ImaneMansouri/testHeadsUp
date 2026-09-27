import { actionPlan } from "./action-plan";
import { compareSnapshots } from "./compare";
import { catalogOptions, getDoctor, getSnapshots } from "./data";
import { explainChange } from "./explain";
import { affectedPatients } from "./match";
import { getState } from "./store";
import { watchCounts } from "./stats";
import type { Change, ResolveAction, StoredWatch } from "./types";

export type AnnotatedChange = Change & {
  affectedCount: number;
  status: "open" | "resolved";
  action: ResolveAction | null;
  notified: boolean;
  resolvedAt: string | null;
  notifiedAt: string | null;
  smsBody: string | null;
  smsMode: "preview" | "twilio" | null;
};

async function bundle() {
  const { before, after } = getSnapshots();
  const doctor = getDoctor();
  const changes = compareSnapshots(before, after);
  const state = await getState();
  const counts = watchCounts(before, after, changes, doctor);
  const annotated: AnnotatedChange[] = changes.map((change) => {
    const stored = state.statuses[change.id];
    return {
      ...change,
      affectedCount: affectedPatients(change, doctor).length,
      status: stored?.status ?? "open",
      action: stored?.action ?? null,
      notified: Boolean(stored?.notifiedAt),
      resolvedAt: stored?.resolvedAt ?? null,
      notifiedAt: stored?.notifiedAt ?? null,
      smsBody: stored?.smsBody ?? null,
      smsMode: stored?.smsMode ?? null,
    };
  });
  return { before, after, doctor, changes, state, counts, annotated };
}

export async function listChanges() {
  const { counts, annotated, state, before, after } = await bundle();
  return {
    hasRun: state.runs.length > 0,
    counts: {
      plans: counts.plans,
      drugs: counts.drugs,
      changes: counts.changes,
      patients: counts.patients,
    },
    chart: [
      { label: "Q2 2026", rows: before.rows.length },
      { label: "Sept 2026", rows: after.rows.length },
    ],
    changes: annotated,
  };
}

export async function getChangeDetail(id: string, includePatients: boolean) {
  const { annotated, doctor, after } = await bundle();
  const change = annotated.find((item) => item.id === id);
  if (!change) return null;
  const patients = affectedPatients(change, doctor);
  const explanation = await explainChange(
    change,
    after.capturedAt,
    doctor.patients.map((patient) => patient.name),
  );
  return {
    change,
    affectedPatients: includePatients ? patients : [],
    affectedCount: patients.length,
    explanation: explanation.text,
    explanationSource: explanation.source,
    status: change.status,
    action: change.action,
    notified: change.notified,
    evidence: {
      beforeFile: change.evidence.beforeFile,
      afterFile: change.evidence.afterFile,
      beforeCapturedAt: getSnapshots().before.capturedAt,
      afterCapturedAt: after.capturedAt,
      beforeLabel: getSnapshots().before.label,
      afterLabel: after.label,
    },
    actionPlan: actionPlan(change.drugName),
    doctorName: doctor.name,
  };
}

export async function findChange(id: string): Promise<Change | null> {
  const { changes } = await bundle();
  return changes.find((change) => change.id === id) ?? null;
}

export function watchesWithStatus(watches: StoredWatch[], changes: AnnotatedChange[]) {
  const options = catalogOptions();
  return watches.map((watch) => {
    const option = options.find((item) => item.planId === watch.planId && item.rxcui === watch.rxcui);
    const match = changes.find((change) => change.planId === watch.planId && change.rxcui === watch.rxcui);
    return {
      ...watch,
      planName: option?.planName ?? watch.planId,
      drugName: option?.drugName ?? watch.rxcui,
      insurer: option?.insurer ?? "",
      change: match
        ? { id: match.id, changeType: match.changeType, direction: match.direction, status: match.status }
        : null,
    };
  });
}
