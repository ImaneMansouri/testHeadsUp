import { monthYearFromCmsFile, shortDrug, shortPlan } from "./format";
import type { Change, ChangeType } from "./types";

function clause(change: Change, drug: string, plan: string): string {
  const insurer = change.insurer;
  const phrases: Record<ChangeType, string> = {
    removed: `${insurer} no longer covers ${drug} on ${plan}`,
    tier_increase: `${insurer} moved ${drug} to a higher tier on ${plan}`,
    tier_decrease: `${insurer} moved ${drug} to a lower tier on ${plan}`,
    prior_authorization_added: `${insurer} now requires prior authorization for ${drug} on ${plan}`,
    prior_authorization_removed: `${insurer} removed prior authorization for ${drug} on ${plan}`,
    step_therapy_added: `${insurer} now requires step therapy for ${drug} on ${plan}`,
    step_therapy_removed: `${insurer} removed step therapy for ${drug} on ${plan}`,
    quantity_limit_added: `${insurer} added a quantity limit for ${drug} on ${plan}`,
    quantity_limit_removed: `${insurer} removed the quantity limit for ${drug} on ${plan}`,
  };
  return phrases[change.changeType];
}

function patientSentence(count: number): string {
  if (count === 1) return "1 of your patients is affected.";
  return `${count} of your patients are affected.`;
}

export function buildSms(change: Change, affectedCount: number, link: string): string {
  const drug = shortDrug(change.drugName);
  const plan = shortPlan(change.planName, change.insurer);
  const when = monthYearFromCmsFile(change.evidence.afterFile);
  const cms = when ? `CMS ${when.short} data` : "the latest CMS data";
  const text = `Heads Up: ${clause(change, drug, plan)} (per ${cms}). ${patientSentence(affectedCount)} Review and act: ${link}`;
  if (text.length <= 320) return text;
  const shorter = `Heads Up: ${clause(change, drug, plan)}. ${patientSentence(affectedCount)} Review and act: ${link}`;
  return shorter.length <= 320 ? shorter : shorter.slice(0, 319).trimEnd();
}
