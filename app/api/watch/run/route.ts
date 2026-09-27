import { randomUUID } from "node:crypto";
import { json } from "@/lib/http";
import { recordRun } from "@/lib/store";
import { runWatch } from "@/lib/watch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await runWatch();
    await recordRun({
      id: randomUUID(),
      startedAt: new Date().toISOString(),
      steps: result.steps,
      changeCount: result.changes.length,
      patientCount: result.counts.patients,
    });
    return json({ steps: result.steps, changes: result.changes });
  } catch {
    return json(
      { error: "The watch couldn't finish. Cached CMS files are still on this server. Try again." },
      500,
    );
  }
}
