import { isInsulin } from "./format";

export type ActionStep = {
  title: string;
  detail: string;
};

export function actionPlan(drugName: string): ActionStep[] {
  return [
    {
      title: "Contact patients before the next refill",
      detail: "A call now keeps the news off the pharmacy counter.",
    },
    {
      title: "Consider a covered alternative",
      detail: isInsulin(drugName)
        ? "No automatic substitute: insulin changes need your clinical judgment."
        : "Check the current formulary for a covered option in the same class.",
    },
    {
      title: "Check manufacturer copay or bridge programs",
      detail: "Copay cards and bridge supply can cover the gap while coverage is fixed.",
    },
    {
      title: "Connect with a reimbursement specialist",
      detail: "A specialist can start an exception or prior authorization with the plan.",
    },
  ];
}
