import { affectedPatients } from "./match";
import type { Change, Doctor, Snapshot, StoredRun, StoredStatus } from "./types";

export type ImpactInput = {
  before: Snapshot;
  after: Snapshot;
  changes: Change[];
  doctor: Doctor;
  runs: StoredRun[];
  statuses: Record<string, StoredStatus>;
  citedDroppedRows: number | null;
  citedSource: string | null;
  citedUrl: string | null;
  citedLabel: string | null;
};

export type FunnelStep = {
  key: "changes" | "patients" | "doctors" | "priorAuths";
  label: string;
  value: number;
};

export type TimingPoint = {
  key: "detectionToAlert" | "alertToResolution";
  label: string;
  ms: number;
};

export type ImpactReport = {
  file: {
    plansWatched: number;
    drugsWatched: number;
    pairsCompared: number;
    changesDetected: number;
    worsened: number;
    improved: number;
    plansAffected: number;
    drugsAffected: number;
    patientsMatched: number;
    doctorsInPanel: number;
    publicationGapDays: number | null;
    beforeCapturedAt: string;
    afterCapturedAt: string;
    beforeFile: string;
    afterFile: string;
  };
  exposure: {
    /** Sum of known prior-formulary dollars. Null when no known price contributed. */
    priorMonthlyKnown: number | null;
    knownPatients: number;
    unknownPatients: number;
  };
  session: {
    hasRun: boolean;
    changesDetected: number;
    patientsMatched: number;
    textsSent: number;
    doctorsAlerted: number;
    patientsAlerted: number;
    priorAuthsStarted: number;
    switched: number;
    reviewed: number;
    detectionAt: string | null;
    alertAt: string | null;
    resolutionAt: string | null;
    msDetectionToAlert: number | null;
    msAlertToResolution: number | null;
  };
  funnel: FunnelStep[];
  timing: TimingPoint[];
  projection: {
    citedDroppedRows: number | null;
    unitCost: number | null;
    totalMonthly: number | null;
    source: string | null;
    url: string | null;
    label: string | null;
    assumptions: string[];
  };
};

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function finiteCost(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function dayStamp(value: string): number | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (!match) return null;
  const parsed = Date.parse(`${match[1]}T00:00:00Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function publicationGapDays(beforeCapturedAt: string, afterCapturedAt: string): number | null {
  const start = dayStamp(beforeCapturedAt);
  const end = dayStamp(afterCapturedAt);
  if (start === null || end === null) return null;
  const days = Math.round((end - start) / 86_400_000);
  return days >= 0 ? days : null;
}

function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : null;
}

function earliest(values: (string | null | undefined)[]): string | null {
  let best: { iso: string; time: number } | null = null;
  for (const iso of values) {
    if (!iso) continue;
    const time = parseTime(iso);
    if (time === null) continue;
    if (!best || time < best.time) best = { iso, time };
  }
  return best?.iso ?? null;
}

function durationMs(startIso: string | null, endIso: string | null): number | null {
  const start = parseTime(startIso);
  const end = parseTime(endIso);
  if (start === null || end === null) return null;
  const delta = end - start;
  return delta >= 0 ? delta : null;
}

export function parseCitedCount(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "–";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) return remSeconds ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

export function formatEstMonthly(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `est. $${formatted}/mo`;
}

function projectionAssumptions(
  citedDroppedRows: number | null,
  citedLabel: string | null,
  citedSource: string | null,
  unitCost: number | null,
  distinctPrices: number,
): string[] {
  const lines: string[] = [];
  if (citedDroppedRows === null) {
    lines.push("No cited dropped-row count was provided, so there is no scale-up total.");
  } else {
    const label = citedLabel ? ` (“${citedLabel}”)` : "";
    const source = citedSource ? ` Source: ${citedSource}.` : "";
    lines.push(
      `${citedDroppedRows.toLocaleString("en-US")} comes from the supplied citation${label}.${source} It is not a count of rows in this watch set.`,
    );
  }
  if (unitCost === null && distinctPrices === 0) {
    lines.push(
      "This snapshot has no removed drug with a known prior monthly cost, so the projected total is Unknown.",
    );
  } else if (unitCost === null) {
    lines.push(
      "Removed drugs in this snapshot have more than one known prior monthly cost. This projection does not average them, so the total is Unknown.",
    );
  } else {
    lines.push(
      `Multiplied by est. $${unitCost.toFixed(2)}, the prior monthly formulary cost of the one removed drug with a known price in this snapshot.`,
    );
  }
  lines.push(
    "Assumption: every cited dropped row had that same prior monthly cost for one month. That is a projection, not a CMS statistic. Unknown prices are not filled in with $0.",
  );
  lines.push("The cash price after a drug is removed is not in these files and stays Unknown.");
  return lines;
}

export function buildImpact(input: ImpactInput): ImpactReport {
  const plans = new Set<string>();
  const drugs = new Set<string>();
  const pairs = new Set<string>();
  for (const row of input.before.rows) {
    plans.add(row.planId);
    drugs.add(row.rxcui);
    pairs.add(`${row.planId}|${row.rxcui}`);
  }
  for (const row of input.after.rows) {
    plans.add(row.planId);
    drugs.add(row.rxcui);
  }

  const plansAffected = new Set<string>();
  const drugsAffected = new Set<string>();
  const matchedPatients = new Set<string>();
  let worsened = 0;
  let improved = 0;
  let knownSum = 0;
  let knownPatients = 0;
  let unknownPatients = 0;
  const removedPrices = new Set<string>();

  for (const change of input.changes) {
    plansAffected.add(change.planId);
    drugsAffected.add(change.rxcui);
    if (change.direction === "improved") {
      improved += 1;
      continue;
    }
    worsened += 1;
    const patients = affectedPatients(change, input.doctor);
    for (const patient of patients) matchedPatients.add(patient.id);
    const count = patients.length;

    if (change.changeType === "removed") {
      const cost = finiteCost(change.before.estMonthlyCost);
      if (cost === null) {
        unknownPatients += count;
      } else {
        removedPrices.add(money(cost).toFixed(2));
        if (count > 0) {
          knownSum += cost * count;
          knownPatients += count;
        }
      }
    } else if (change.changeType === "tier_increase") {
      const beforeCost = finiteCost(change.before.estMonthlyCost);
      const afterCost = finiteCost(change.after?.estMonthlyCost);
      if (beforeCost === null || afterCost === null) {
        unknownPatients += count;
      } else if (afterCost > beforeCost && count > 0) {
        knownSum += (afterCost - beforeCost) * count;
        knownPatients += count;
      }
    }
  }

  const priorMonthlyKnown = knownPatients > 0 ? money(knownSum) : null;
  const unitCost = removedPrices.size === 1 ? Number([...removedPrices][0]) : null;
  const totalMonthly =
    input.citedDroppedRows !== null && unitCost !== null ? money(input.citedDroppedRows * unitCost) : null;

  const latest = input.runs[0];
  const hasRun = input.runs.length > 0;
  const notifiedChanges = input.changes.filter((change) => Boolean(input.statuses[change.id]?.notifiedAt));
  const alertedPatients = new Set<string>();
  for (const change of notifiedChanges) {
    if (change.direction !== "worsened") continue;
    for (const patient of affectedPatients(change, input.doctor)) alertedPatients.add(patient.id);
  }

  let priorAuthsStarted = 0;
  let switched = 0;
  let reviewed = 0;
  for (const change of input.changes) {
    const action = input.statuses[change.id]?.action;
    if (action === "prior_auth_started") priorAuthsStarted += 1;
    else if (action === "switched") switched += 1;
    else if (action === "reviewed") reviewed += 1;
  }

  const detectionAt = earliest(input.runs.map((run) => run.startedAt));
  const alertAt = earliest(notifiedChanges.map((change) => input.statuses[change.id]?.notifiedAt));
  const resolutionAt = earliest(
    input.changes.map((change) => input.statuses[change.id]?.resolvedAt),
  );
  const msDetectionToAlert = durationMs(detectionAt, alertAt);
  const msAlertToResolution = durationMs(alertAt, resolutionAt);

  const sessionChanges = hasRun ? latest.changeCount : 0;
  const sessionPatients = hasRun ? latest.patientCount : 0;
  const textsSent = notifiedChanges.length;
  const doctorsAlerted = textsSent > 0 && input.doctor.id ? 1 : 0;

  const timing: TimingPoint[] = [];
  if (msDetectionToAlert !== null) {
    timing.push({
      key: "detectionToAlert",
      label: "File check → text",
      ms: msDetectionToAlert,
    });
  }
  if (msAlertToResolution !== null) {
    timing.push({
      key: "alertToResolution",
      label: "Text → resolution",
      ms: msAlertToResolution,
    });
  }

  return {
    file: {
      plansWatched: plans.size,
      drugsWatched: drugs.size,
      pairsCompared: pairs.size,
      changesDetected: input.changes.length,
      worsened,
      improved,
      plansAffected: plansAffected.size,
      drugsAffected: drugsAffected.size,
      patientsMatched: matchedPatients.size,
      doctorsInPanel: input.doctor.id ? 1 : 0,
      publicationGapDays: publicationGapDays(input.before.capturedAt, input.after.capturedAt),
      beforeCapturedAt: input.before.capturedAt,
      afterCapturedAt: input.after.capturedAt,
      beforeFile: input.before.sourceFile,
      afterFile: input.after.sourceFile,
    },
    exposure: {
      priorMonthlyKnown,
      knownPatients,
      unknownPatients,
    },
    session: {
      hasRun,
      changesDetected: sessionChanges,
      patientsMatched: sessionPatients,
      textsSent,
      doctorsAlerted,
      patientsAlerted: alertedPatients.size,
      priorAuthsStarted,
      switched,
      reviewed,
      detectionAt,
      alertAt,
      resolutionAt,
      msDetectionToAlert,
      msAlertToResolution,
    },
    funnel: [
      { key: "changes", label: "Changes detected", value: sessionChanges },
      { key: "patients", label: "Patients matched", value: sessionPatients },
      { key: "doctors", label: "Doctors alerted", value: doctorsAlerted },
      { key: "priorAuths", label: "Prior auths started", value: priorAuthsStarted },
    ],
    timing,
    projection: {
      citedDroppedRows: input.citedDroppedRows,
      unitCost,
      totalMonthly,
      source: input.citedSource,
      url: input.citedUrl,
      label: input.citedLabel,
      assumptions: projectionAssumptions(
        input.citedDroppedRows,
        input.citedLabel,
        input.citedSource,
        unitCost,
        removedPrices.size,
      ),
    },
  };
}
