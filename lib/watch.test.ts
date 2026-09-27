import { describe, expect, it, vi } from "vitest";
import { CMS_FALLBACK, findFormularyModified } from "./cms";
import { runWatch } from "./watch";

describe("runWatch", () => {
  it("reads the formulary modified date from a catalog payload", () => {
    expect(
      findFormularyModified({
        dataset: [
          { title: "Something else", modified: "2020-01-01" },
          {
            title: "Monthly Prescription Drug Plan Formulary and Pharmacy Network Information",
            modified: "2026-09-23",
          },
        ],
      }),
    ).toBe("2026-09-23");
  });

  it("computes snapshot counts and still finishes when the catalog times out", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    const result = await runWatch({ cmsTimeoutMs: 20, fetchImpl });
    expect(result.steps[0]?.label).toBe(CMS_FALLBACK);
    expect(result.steps[1]?.label).toBe("Loaded snapshot v1: 3 rows (CMS Q2 2026)");
    expect(result.steps[2]?.label).toBe("Loaded snapshot v2-cms: 2 rows (CMS Sept 2026)");
    expect(result.steps[3]?.label).toBe("Compared 3 plan/drug pairs: 1 change detected");
    expect(result.steps[4]?.label).toBe("Matched to Dr. Amina Lee's panel: 3 patients affected");
    expect(result.changes).toHaveLength(1);
    expect(result.steps.every((step) => typeof step.ms === "number")).toBe(true);
  });
});
