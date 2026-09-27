import { describe, expect, it } from "vitest";
import { compareSnapshots } from "./compare";
import { getDoctor, getSnapshots } from "./data";
import { affectedPatients } from "./match";
import type { Change } from "./types";

describe("affectedPatients", () => {
  it("returns exactly the three Kaiser NovoLog patients", () => {
    const { before, after } = getSnapshots();
    const doctor = getDoctor();
    const change = compareSnapshots(before, after)[0];
    expect(affectedPatients(change, doctor).map((patient) => patient.id)).toEqual([
      "pt-001",
      "pt-002",
      "pt-003",
    ]);
  });

  it("returns nobody for an improved change", () => {
    const doctor = getDoctor();
    const change = {
      direction: "improved",
      planId: "H1170-002",
      rxcui: "1653204",
    } as Change;
    expect(affectedPatients(change, doctor)).toEqual([]);
  });
});
