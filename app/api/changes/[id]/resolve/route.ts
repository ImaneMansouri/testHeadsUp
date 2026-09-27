import { json } from "@/lib/http";
import { findChange } from "@/lib/present";
import { resolveChange } from "@/lib/store";
import type { ResolveAction } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIONS: ResolveAction[] = ["reviewed", "switched", "prior_auth_started"];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { action?: string } | null;
    const action = body?.action;
    if (!action || !ACTIONS.includes(action as ResolveAction)) {
      return json({ error: "Choose reviewed, switched medication, or prior auth started." }, 400);
    }
    const change = await findChange(id);
    if (!change) return json({ error: "That change is not in the current CMS snapshots." }, 404);
    await resolveChange(id, action as ResolveAction);
    return json({ ok: true, status: "resolved", action });
  } catch {
    return json({ error: "We couldn't save that action. Try again." }, 500);
  }
}
