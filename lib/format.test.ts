import { describe, expect, it } from "vitest";
import { formatEstCost } from "./format";

describe("formatEstCost", () => {
  it("labels estimates and never turns unknown into zero", () => {
    expect(formatEstCost(47)).toBe("est. $47.00/mo");
    expect(formatEstCost(133.56)).toBe("est. $133.56/mo");
    expect(formatEstCost(null)).toBe("Unknown");
    expect(formatEstCost(undefined)).toBe("Unknown");
  });
});
