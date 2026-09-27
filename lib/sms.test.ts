import { describe, expect, it } from "vitest";
import { compareSnapshots } from "./compare";
import { getDoctor, getSnapshots } from "./data";
import { buildSms } from "./sms";
import type { Change, ChangeType } from "./types";

const NAMES = [
  "Diane Whitfield",
  "Marcus Reyes",
  "Sandra Nguyen",
  "Harold Betancourt",
  "Rosa Lindqvist",
];

function assertNoNames(body: string) {
  for (const name of NAMES) {
    expect(body.toLowerCase()).not.toContain(name.toLowerCase());
  }
  expect(body.length).toBeLessThanOrEqual(320);
}

describe("buildSms", () => {
  it("matches the removal text, hides every patient name, and stays within 320 characters", () => {
    const { before, after } = getSnapshots();
    const change = compareSnapshots(before, after)[0];
    const link = "http://localhost:3000/m/testid";
    const body = buildSms(change, 3, link);
    expect(body).toBe(
      "Heads Up: Kaiser Permanente no longer covers NovoLog FlexPen on Senior Advantage Enhanced 1 (per CMS Sept 2026 data). 3 of your patients are affected. Review and act: http://localhost:3000/m/testid",
    );
    assertNoNames(body);
    expect(body).toContain(link);
  });

  it("keeps other change types nameless and within the character limit", () => {
    const { before, after } = getSnapshots();
    const base = compareSnapshots(before, after)[0];
    const link = "https://heads-up-demo.vercel.app/m/0123456789abcdef";
    const types: ChangeType[] = [
      "tier_increase",
      "prior_authorization_added",
      "step_therapy_added",
      "quantity_limit_added",
      "tier_decrease",
      "prior_authorization_removed",
      "step_therapy_removed",
      "quantity_limit_removed",
    ];
    for (const changeType of types) {
      const change = { ...base, changeType } as Change;
      const body = buildSms(change, 3, link);
      assertNoNames(body);
      expect(body.startsWith("Heads Up:")).toBe(true);
      expect(body.endsWith(link)).toBe(true);
    }
    expect(buildSms(base, 1, link)).toContain("1 of your patients is affected.");
  });
});
