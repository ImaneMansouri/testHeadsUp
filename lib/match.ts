import type { Change, Doctor, Patient } from "./types";

export function affectedPatients(change: Change, doctor: Doctor): Patient[] {
  if (change.direction !== "worsened") return [];
  return doctor.patients.filter(
    (patient) => patient.planId === change.planId && patient.rxcuis.includes(change.rxcui),
  );
}
