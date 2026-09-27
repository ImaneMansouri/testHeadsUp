import { afterEach, describe, expect, it, vi } from "vitest";
import { compareSnapshots } from "./compare";
import { getDoctor, getSnapshots } from "./data";
import { explainChange, grokMessages, templateExplanation } from "./explain";

afterEach(() => {
  delete process.env.XAI_API_KEY;
  vi.unstubAllGlobals();
});

describe("explain", () => {
  it("uses the deterministic removal template", () => {
    const { before, after } = getSnapshots();
    const change = compareSnapshots(before, after)[0];
    expect(templateExplanation(change, after.capturedAt)).toBe(
      "Kaiser Permanente's September 2026 formulary no longer lists NovoLog FlexPen for this plan. Patients filling it at their next refill may face full price unless they switch or get an exception.",
    );
  });

  it("never sends patient names to Grok and falls back when the call fails", async () => {
    const { before, after } = getSnapshots();
    const change = compareSnapshots(before, after)[0];
    const names = getDoctor().patients.map((patient) => patient.name);
    const messages = grokMessages(templateExplanation(change, after.capturedAt));
    const blob = JSON.stringify(messages);
    for (const name of names) expect(blob).not.toContain(name);

    process.env.XAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const result = await explainChange(change, after.capturedAt, names);
    expect(result.source).toBe("template");
    expect(result.text).toBe(templateExplanation(change, after.capturedAt));
  });
});
