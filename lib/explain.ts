import { longMonthYear, shortDrug } from "./format";
import type { Change, ChangeType } from "./types";

const cache = new Map<string, { text: string; source: "template" | "grok" }>();

export function templateExplanation(change: Change, afterCapturedAt: string): string {
  const insurer = change.insurer;
  const month = longMonthYear(afterCapturedAt);
  const drug = shortDrug(change.drugName);
  const templates: Record<ChangeType, string> = {
    removed: `${insurer}'s ${month} formulary no longer lists ${drug} for this plan. Patients filling it at their next refill may face full price unless they switch or get an exception.`,
    tier_increase: `${insurer}'s ${month} formulary moved ${drug} to a higher tier on this plan. Patients may pay more at the next refill than they did before.`,
    tier_decrease: `${insurer}'s ${month} formulary moved ${drug} to a lower tier on this plan. Patients may pay less at the next refill.`,
    prior_authorization_added: `${insurer}'s ${month} formulary now requires prior authorization for ${drug} on this plan. A pharmacy may refuse the fill until authorization is on file.`,
    prior_authorization_removed: `${insurer}'s ${month} formulary no longer requires prior authorization for ${drug} on this plan. Patients may fill it without that approval step.`,
    step_therapy_added: `${insurer}'s ${month} formulary now requires step therapy for ${drug} on this plan. The plan may expect another drug to be tried first.`,
    step_therapy_removed: `${insurer}'s ${month} formulary no longer requires step therapy for ${drug} on this plan.`,
    quantity_limit_added: `${insurer}'s ${month} formulary now applies a quantity limit to ${drug} on this plan. Fills above the limit may be rejected.`,
    quantity_limit_removed: `${insurer}'s ${month} formulary no longer applies a quantity limit to ${drug} on this plan.`,
  };
  return templates[change.changeType];
}

export function grokMessages(template: string): { role: "system" | "user"; content: string }[] {
  return [
    {
      role: "system",
      content:
        "You rephrase physician-facing coverage explanations. Do not invent facts, costs, clinical advice, or patient details. Do not mention any patient name. Two sentences maximum. Return only the rephrased explanation.",
    },
    { role: "user", content: template },
  ];
}

function containsPatientName(text: string, patientNames: string[]): boolean {
  const lower = text.toLowerCase();
  return patientNames.some((name) => name.trim().length > 0 && lower.includes(name.toLowerCase()));
}

export function clearExplanationCache(): void {
  cache.clear();
}

export async function explainChange(
  change: Change,
  afterCapturedAt: string,
  patientNames: string[],
): Promise<{ text: string; source: "template" | "grok" }> {
  const template = templateExplanation(change, afterCapturedAt);
  const cached = cache.get(change.id);
  if (cached) return cached;

  const key = process.env.XAI_API_KEY?.trim();
  if (!key) return { text: template, source: "template" };

  try {
    const model = process.env.XAI_MODEL?.trim() || "grok-3";
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: grokMessages(template),
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return { text: template, source: "template" };
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text || containsPatientName(text, patientNames)) {
      return { text: template, source: "template" };
    }
    const result = { text, source: "grok" as const };
    cache.set(change.id, result);
    return result;
  } catch {
    return { text: template, source: "template" };
  }
}
