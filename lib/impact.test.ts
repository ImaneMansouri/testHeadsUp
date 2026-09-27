import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compareSnapshots } from "./compare";
import { getDoctor, getFacts, getSnapshots } from "./data";
import {
  buildImpact,
  formatDuration,
  formatEstMonthly,
  parseCitedCount,
  type ImpactInput,
} from "./impact";
import { __resetMemoryForTests, getState, markNotified, recordRun, resetDemo, resolveChange } from "./store";
import type { Change, CoverageRow, Doctor, Snapshot, StoredStatus } from "./types";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "headsup-impact-"));

afterEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.HEADSUP_STATE_PATH;
  __resetMemoryForTests();
});

function row(overrides: Partial<CoverageRow> = {}): CoverageRow {
  return {
    planId: "H1170-002",
    planName: "Kaiser Permanente Senior Advantage Enhanced 1 (HMO)",
    insurer: "Kaiser Permanente",
    formularyId: "00026405",
    rxcui: "1653204",
    drugName: "NovoLog FlexPen (insulin aspart)",
    covered: true,
    tier: 3,
    priorAuthorization: false,
    stepTherapy: false,
    quantityLimit: false,
    estMonthlyCost: 47,
    ...overrides,
  };
}

function snap(id: string, capturedAt: string, rows: CoverageRow[]): Snapshot {
  return { id, label: id, sourceFile: `${id}.zip`, capturedAt, rows };
}

function change(overrides: Partial<Change> = {}): Change {
  const before = overrides.before ?? row();
  return {
    id: overrides.id ?? "change-1",
    planId: before.planId,
    planName: before.planName,
    insurer: before.insurer,
    rxcui: before.rxcui,
    drugName: before.drugName,
    changeType: "removed",
    direction: "worsened",
    before,
    after: null,
    evidence: { beforeFile: "before.zip", afterFile: "after.zip" },
    ...overrides,
  };
}

const doctor: Doctor = {
  id: "doc-001",
  name: "Dr. Amina Lee",
  specialty: "Family medicine",
  practice: "Peachtree",
  patients: [
    { id: "pt-001", name: "Diane Whitfield", planId: "H1170-002", rxcuis: ["1653204"] },
    { id: "pt-002", name: "Marcus Reyes", planId: "H1170-002", rxcuis: ["1653204"] },
    { id: "pt-003", name: "Sandra Nguyen", planId: "H1170-002", rxcuis: ["1653204"] },
  ],
};

function baseInput(overrides: Partial<ImpactInput> = {}): ImpactInput {
  const before = snap("v1", "2026-07-01", [row()]);
  const after = snap("v2", "2026-09-16", []);
  return {
    before,
    after,
    changes: [change()],
    doctor,
    runs: [],
    statuses: {},
    citedDroppedRows: 1202,
    citedSource: "Our analysis of CMS Part D formulary files",
    citedUrl: "https://data.cms.gov/example",
    citedLabel: "drug coverage rows dropped",
    ...overrides,
  };
}

describe("buildImpact", () => {
  it("measures the Kaiser snapshot: one removal, three patients, est. $141, 77 days", () => {
    const { before, after } = getSnapshots();
    const facts = getFacts();
    const cited = facts.find((fact) => fact.label.includes("drug coverage rows dropped"));
    expect(cited).toBeTruthy();
    const report = buildImpact({
      before,
      after,
      changes: compareSnapshots(before, after),
      doctor: getDoctor(),
      runs: [],
      statuses: {},
      citedDroppedRows: parseCitedCount(cited!.value),
      citedSource: cited!.source,
      citedUrl: cited!.url,
      citedLabel: cited!.label,
    });

    expect(report.file.plansWatched).toBe(2);
    expect(report.file.drugsWatched).toBe(2);
    expect(report.file.pairsCompared).toBe(3);
    expect(report.file.changesDetected).toBe(1);
    expect(report.file.worsened).toBe(1);
    expect(report.file.plansAffected).toBe(1);
    expect(report.file.drugsAffected).toBe(1);
    expect(report.file.patientsMatched).toBe(3);
    expect(report.file.doctorsInPanel).toBe(1);
    expect(report.file.publicationGapDays).toBe(77);
    expect(report.exposure.priorMonthlyKnown).toBe(141);
    expect(report.exposure.knownPatients).toBe(3);
    expect(report.exposure.unknownPatients).toBe(0);
    expect(report.projection.unitCost).toBe(47);
    expect(report.projection.citedDroppedRows).toBe(1202);
    expect(report.projection.totalMonthly).toBe(56494);
    expect(report.session.hasRun).toBe(false);
    expect(report.session.changesDetected).toBe(0);
    expect(report.session.textsSent).toBe(0);
    expect(report.session.doctorsAlerted).toBe(0);
    expect(report.session.priorAuthsStarted).toBe(0);
    expect(report.session.msDetectionToAlert).toBeNull();
    expect(report.session.msAlertToResolution).toBeNull();
    expect(report.funnel.map((step) => step.value)).toEqual([0, 0, 0, 0]);
    expect(report.timing).toEqual([]);
    expect(report.projection.assumptions.join(" ")).toMatch(/projection/i);
    expect(report.projection.assumptions.join(" ")).toMatch(/not a CMS statistic/i);
  });

  it("keeps a missing removal price as Unknown and does not coerce it to $0", () => {
    const report = buildImpact(
      baseInput({
        changes: [change({ before: row({ estMonthlyCost: null }) })],
        citedDroppedRows: 1202,
      }),
    );
    expect(report.exposure.priorMonthlyKnown).toBeNull();
    expect(report.exposure.unknownPatients).toBe(3);
    expect(report.exposure.knownPatients).toBe(0);
    expect(report.projection.unitCost).toBeNull();
    expect(report.projection.totalMonthly).toBeNull();
    expect(formatEstMonthly(report.exposure.priorMonthlyKnown)).toBe("Unknown");
  });

  it("sums known prices and counts unknown patients separately", () => {
    const priced = change({ id: "priced", before: row({ estMonthlyCost: 47 }) });
    const missing = change({
      id: "missing",
      rxcui: "999",
      before: row({ rxcui: "999", estMonthlyCost: null, drugName: "Other" }),
    });
    const panel: Doctor = {
      ...doctor,
      patients: [
        ...doctor.patients,
        { id: "pt-009", name: "Unknown Price", planId: "H1170-002", rxcuis: ["999"] },
      ],
    };
    const report = buildImpact(baseInput({ changes: [priced, missing], doctor: panel }));
    expect(report.exposure.priorMonthlyKnown).toBe(141);
    expect(report.exposure.knownPatients).toBe(3);
    expect(report.exposure.unknownPatients).toBe(1);
    expect(report.projection.unitCost).toBe(47);
  });

  it("does not invent a dollar for prior auth, step therapy, or quantity limit", () => {
    const report = buildImpact(
      baseInput({
        changes: [
          change({
            changeType: "prior_authorization_added",
            before: row({ priorAuthorization: false, estMonthlyCost: 47 }),
            after: row({ priorAuthorization: true, estMonthlyCost: 47 }),
          }),
        ],
      }),
    );
    expect(report.file.patientsMatched).toBe(3);
    expect(report.exposure.priorMonthlyKnown).toBeNull();
    expect(report.exposure.unknownPatients).toBe(0);
    expect(report.projection.unitCost).toBeNull();
  });

  it("counts a real zero cost as known and ignores improved changes", () => {
    const report = buildImpact(
      baseInput({
        changes: [
          change({ id: "free", before: row({ estMonthlyCost: 0 }) }),
          change({
            id: "better",
            direction: "improved",
            changeType: "tier_decrease",
            before: row({ estMonthlyCost: 80 }),
            after: row({ estMonthlyCost: 10, tier: 1 }),
          }),
        ],
      }),
    );
    expect(report.file.patientsMatched).toBe(3);
    expect(report.file.improved).toBe(1);
    expect(report.exposure.priorMonthlyKnown).toBe(0);
    expect(report.exposure.knownPatients).toBe(3);
    expect(report.projection.unitCost).toBe(0);
    expect(report.projection.totalMonthly).toBe(0);
  });

  it("adds a tier increase only when both prices are known", () => {
    const known = buildImpact(
      baseInput({
        changes: [
          change({
            changeType: "tier_increase",
            before: row({ estMonthlyCost: 10, tier: 2 }),
            after: row({ estMonthlyCost: 25, tier: 3 }),
          }),
        ],
      }),
    );
    expect(known.exposure.priorMonthlyKnown).toBe(45);
    expect(known.projection.unitCost).toBeNull();

    const missing = buildImpact(
      baseInput({
        changes: [
          change({
            changeType: "tier_increase",
            before: row({ estMonthlyCost: 10, tier: 2 }),
            after: row({ estMonthlyCost: null, tier: 3 }),
          }),
        ],
      }),
    );
    expect(missing.exposure.priorMonthlyKnown).toBeNull();
    expect(missing.exposure.unknownPatients).toBe(3);
  });

  it("measures session clocks and leaves an inverted or invalid clock blank", () => {
    const statuses: Record<string, StoredStatus> = {
      "change-1": {
        status: "resolved",
        action: "prior_auth_started",
        resolvedAt: "2026-09-27T04:02:00.000Z",
        notifiedAt: "2026-09-27T04:00:08.000Z",
        smsBody: "Heads Up",
        smsMode: "preview",
      },
    };
    const report = buildImpact(
      baseInput({
        runs: [
          {
            id: "new",
            startedAt: "2026-09-27T04:00:08.000Z",
            steps: [],
            changeCount: 1,
            patientCount: 3,
          },
          {
            id: "old",
            startedAt: "2026-09-27T04:00:00.000Z",
            steps: [],
            changeCount: 5,
            patientCount: 1,
          },
        ],
        statuses,
      }),
    );
    expect(report.session.hasRun).toBe(true);
    expect(report.session.changesDetected).toBe(1);
    expect(report.session.patientsMatched).toBe(3);
    expect(report.session.textsSent).toBe(1);
    expect(report.session.doctorsAlerted).toBe(1);
    expect(report.session.patientsAlerted).toBe(3);
    expect(report.session.priorAuthsStarted).toBe(1);
    expect(report.session.detectionAt).toBe("2026-09-27T04:00:00.000Z");
    expect(report.session.msDetectionToAlert).toBe(8000);
    expect(report.session.msAlertToResolution).toBe(112000);
    expect(report.funnel.map((step) => step.value)).toEqual([1, 3, 1, 1]);
    expect(report.timing.map((point) => point.key)).toEqual(["detectionToAlert", "alertToResolution"]);
    expect(report.file.publicationGapDays).toBe(77);
    expect(report.exposure.priorMonthlyKnown).toBe(141);

    const inverted = buildImpact(
      baseInput({
        runs: [
          {
            id: "run",
            startedAt: "2026-09-27T04:00:10.000Z",
            steps: [],
            changeCount: 1,
            patientCount: 3,
          },
        ],
        statuses: {
          "change-1": {
            status: "open",
            action: null,
            resolvedAt: null,
            notifiedAt: "2026-09-27T04:00:00.000Z",
            smsBody: "Heads Up",
            smsMode: "preview",
          },
        },
      }),
    );
    expect(inverted.session.textsSent).toBe(1);
    expect(inverted.session.msDetectionToAlert).toBeNull();
    expect(inverted.timing).toEqual([]);

    const invalid = buildImpact(
      baseInput({
        runs: [
          {
            id: "run",
            startedAt: "not-a-date",
            steps: [],
            changeCount: 1,
            patientCount: 3,
          },
        ],
        statuses: {
          "change-1": {
            status: "open",
            action: null,
            resolvedAt: null,
            notifiedAt: "also-not",
            smsBody: null,
            smsMode: "preview",
          },
        },
      }),
    );
    expect(invalid.session.detectionAt).toBeNull();
    expect(invalid.session.alertAt).toBeNull();
    expect(invalid.session.msDetectionToAlert).toBeNull();
  });

  it("does not average two different removed prices", () => {
    const report = buildImpact(
      baseInput({
        changes: [
          change({ id: "a", before: row({ estMonthlyCost: 47 }) }),
          change({
            id: "b",
            planId: "OTHER",
            rxcui: "1",
            before: row({ planId: "OTHER", rxcui: "1", estMonthlyCost: 10 }),
          }),
        ],
      }),
    );
    expect(report.projection.unitCost).toBeNull();
    expect(report.projection.totalMonthly).toBeNull();
    expect(report.projection.assumptions.join(" ")).toMatch(/does not average/i);
  });

  it("restores session zeros after a demo reset and keeps the file exposure", async () => {
    process.env.HEADSUP_STATE_PATH = path.join(dir, "state.json");
    __resetMemoryForTests();
    const { before, after } = getSnapshots();
    const changes = compareSnapshots(before, after);
    const cited = getFacts().find((fact) => fact.label.includes("drug coverage rows dropped"))!;
    const input = {
      before,
      after,
      changes,
      doctor: getDoctor(),
      citedDroppedRows: parseCitedCount(cited.value),
      citedSource: cited.source,
      citedUrl: cited.url,
      citedLabel: cited.label,
    };
    await recordRun({
      id: "run-1",
      startedAt: "2026-09-01T00:00:00.000Z",
      steps: [],
      changeCount: changes.length,
      patientCount: 3,
    });
    await markNotified(changes[0].id, "Heads Up", "preview");
    await resolveChange(changes[0].id, "prior_auth_started");
    const duringState = await getState();
    const during = buildImpact({ ...input, runs: duringState.runs, statuses: duringState.statuses });
    expect(during.session.textsSent).toBe(1);
    expect(during.session.doctorsAlerted).toBe(1);
    expect(during.session.priorAuthsStarted).toBe(1);
    expect(during.session.patientsAlerted).toBe(3);
    expect(during.session.msDetectionToAlert).toBeGreaterThan(0);
    expect(during.session.msAlertToResolution).toBeGreaterThanOrEqual(0);

    await resetDemo();
    const cleared = await getState();
    const afterReset = buildImpact({ ...input, runs: cleared.runs, statuses: cleared.statuses });
    expect(cleared.runs).toEqual([]);
    expect(afterReset.session.hasRun).toBe(false);
    expect(afterReset.session.changesDetected).toBe(0);
    expect(afterReset.session.patientsMatched).toBe(0);
    expect(afterReset.session.textsSent).toBe(0);
    expect(afterReset.session.doctorsAlerted).toBe(0);
    expect(afterReset.session.priorAuthsStarted).toBe(0);
    expect(afterReset.session.msDetectionToAlert).toBeNull();
    expect(afterReset.session.msAlertToResolution).toBeNull();
    expect(afterReset.funnel.every((step) => step.value === 0)).toBe(true);
    expect(afterReset.timing).toEqual([]);
    expect(afterReset.exposure.priorMonthlyKnown).toBe(141);
    expect(afterReset.file.changesDetected).toBe(1);
    expect(afterReset.file.patientsMatched).toBe(3);
  });
});

describe("impact formatting", () => {
  it("parses cited counts and formats durations and estimates", () => {
    expect(parseCitedCount("1,202")).toBe(1202);
    expect(parseCitedCount("79%")).toBeNull();
    expect(formatDuration(null)).toBe("–");
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(8000)).toBe("8s");
    expect(formatDuration(120000)).toBe("2m");
    expect(formatDuration(125000)).toBe("2m 5s");
    expect(formatEstMonthly(null)).toBe("Unknown");
    expect(formatEstMonthly(141)).toBe("est. $141.00/mo");
    expect(formatEstMonthly(56494)).toBe("est. $56,494.00/mo");
    expect(formatEstMonthly(0)).toBe("est. $0.00/mo");
  });
});
