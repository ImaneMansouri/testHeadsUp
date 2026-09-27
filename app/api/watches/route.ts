import { catalogOptions } from "@/lib/data";
import { json } from "@/lib/http";
import { listChanges, watchesWithStatus } from "@/lib/present";
import { addWatch, getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [listed, state] = await Promise.all([listChanges(), getState()]);
    return json({ watches: watchesWithStatus(state.watches, listed.changes) });
  } catch {
    return json({ error: "We couldn't load watches. Try again." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { planId?: string; rxcui?: string } | null;
    const planId = body?.planId?.trim();
    const rxcui = body?.rxcui?.trim();
    if (!planId || !rxcui) return json({ error: "Pick a plan and a drug." }, 400);
    const known = catalogOptions().some((option) => option.planId === planId && option.rxcui === rxcui);
    if (!known) return json({ error: "That plan and drug are not in the CMS snapshots." }, 400);
    await addWatch(planId, rxcui);
    const [listed, state] = await Promise.all([listChanges(), getState()]);
    return json({ watches: watchesWithStatus(state.watches, listed.changes) });
  } catch {
    return json({ error: "We couldn't save that watch. Try again." }, 500);
  }
}
