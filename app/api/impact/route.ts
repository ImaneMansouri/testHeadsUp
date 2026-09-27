import { compareSnapshots } from "@/lib/compare";
import { getDoctor, getFacts, getSnapshots } from "@/lib/data";
import { json } from "@/lib/http";
import { buildImpact, parseCitedCount } from "@/lib/impact";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { before, after } = getSnapshots();
    const facts = getFacts();
    const cited = facts.find((fact) => fact.label.toLowerCase().includes("drug coverage rows dropped"));
    const state = await getState();
    const report = buildImpact({
      before,
      after,
      changes: compareSnapshots(before, after),
      doctor: getDoctor(),
      runs: state.runs,
      statuses: state.statuses,
      citedDroppedRows: cited ? parseCitedCount(cited.value) : null,
      citedSource: cited?.source ?? null,
      citedUrl: cited?.url ?? null,
      citedLabel: cited?.label ?? null,
    });
    return json({ ...report, externalFacts: facts });
  } catch {
    return json({ error: "We couldn't load the impact numbers. Try again." }, 500);
  }
}
