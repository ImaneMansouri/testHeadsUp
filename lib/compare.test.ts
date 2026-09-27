import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { compareSnapshots, makeChangeId } from "./compare";
import { getSnapshots } from "./data";
import type { CoverageRow, Snapshot } from "./types";

function row(overrides: Partial<CoverageRow> = {}): CoverageRow {
  return {
    planId: "P1",
    planName: "Example Plan (HMO)",
    insurer: "Example",
    formularyId: "0001",
    rxcui: "111",
    drugName: "Example Drug (demo)",
    covered: true,
    tier: 2,
    priorAuthorization: false,
    stepTherapy: false,
    quantityLimit: false,
    estMonthlyCost: 10,
    ...overrides,
  };
}

function snap(id: string, rows: CoverageRow[], sourceFile = `${id}.zip`): Snapshot {
  return {
    id,
    label: id,
    sourceFile,
    capturedAt: "2026-01-01",
    rows,
  };
}

describe("compareSnapshots", () => {
  it("detects the Kaiser NovoLog removal and ignores unchanged Humana rows", () => {
    const { before, after } = getSnapshots();
    const changes = compareSnapshots(before, after);
    expect(changes).toHaveLength(1);
    const change = changes[0];
    expect(change.planId).toBe("H1170-002");
    expect(change.rxcui).toBe("1653204");
    expect(change.changeType).toBe("removed");
    expect(change.direction).toBe("worsened");
    expect(change.after).toBeNull();
    expect(change.evidence).toEqual({
      beforeFile: "SPUF_2026_20260701.zip",
      afterFile: "2026_20260916.zip",
    });
    expect(changes.some((item) => item.planId === "S5884-135")).toBe(false);
    const expectedId = createHash("sha256")
      .update(["H1170-002", "1653204", "removed", "v1", "v2-cms"].join("|"))
      .digest("hex")
      .slice(0, 16);
    expect(change.id).toBe(expectedId);
    expect(change.id).toBe(makeChangeId("H1170-002", "1653204", "removed", "v1", "v2-cms"));
  });

  it("returns no changes for identical snapshots", () => {
    const { before } = getSnapshots();
    expect(compareSnapshots(before, structuredClone(before))).toEqual([]);
  });

  it("does not emit a change when a compared field is null on either side", () => {
    const base = row();
    expect(
      compareSnapshots(snap("b", [row({ tier: null })]), snap("a", [row({ tier: 4 })])),
    ).toEqual([]);
    expect(
      compareSnapshots(snap("b", [row({ tier: 2 })]), snap("a", [row({ tier: null })])),
    ).toEqual([]);
    expect(
      compareSnapshots(
        snap("b", [row({ priorAuthorization: null })]),
        snap("a", [row({ priorAuthorization: true })]),
      ),
    ).toEqual([]);
    expect(
      compareSnapshots(
        snap("b", [row({ quantityLimit: false })]),
        snap("a", [row({ quantityLimit: null })]),
      ),
    ).toEqual([]);
    expect(
      compareSnapshots(snap("b", [row({ covered: null })]), snap("a", [])),
    ).toEqual([]);
    expect(
      compareSnapshots(snap("b", [base]), snap("a", [{ ...base, estMonthlyCost: null }])),
    ).toEqual([]);
  });

  it("emits one Change per type when a row has two changes", () => {
    const changes = compareSnapshots(
      snap("b", [row({ tier: 1, priorAuthorization: false })]),
      snap("a", [row({ tier: 3, priorAuthorization: true })]),
    );
    expect(changes.map((change) => change.changeType)).toEqual([
      "tier_increase",
      "prior_authorization_added",
    ]);
    expect(new Set(changes.map((change) => change.id)).size).toBe(2);
  });

  it("marks tier decreases and removed prior authorization as improved", () => {
    const changes = compareSnapshots(
      snap("b", [row({ tier: 3, priorAuthorization: true })]),
      snap("a", [row({ tier: 1, priorAuthorization: false })]),
    );
    expect(changes.map((change) => [change.changeType, change.direction])).toEqual([
      ["tier_decrease", "improved"],
      ["prior_authorization_removed", "improved"],
    ]);
  });

  it("treats covered:false in the later file as removed", () => {
    const changes = compareSnapshots(
      snap("b", [row({ covered: true })]),
      snap("a", [row({ covered: false })]),
    );
    expect(changes.map((change) => change.changeType)).toContain("removed");
    expect(changes.find((change) => change.changeType === "removed")?.after?.covered).toBe(false);
  });
});
