import { getDoctor } from "@/lib/data";
import { json } from "@/lib/http";
import { affectedPatients } from "@/lib/match";
import { findChange } from "@/lib/present";
import { buildSms } from "@/lib/sms";
import { markNotified } from "@/lib/store";
import { sendSms } from "@/lib/twilio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { changeId?: string } | null;
    const changeId = body?.changeId;
    if (!changeId) return json({ error: "Choose a coverage change before sending a text." }, 400);
    const change = await findChange(changeId);
    if (!change) return json({ error: "That change is not in the current CMS snapshots." }, 404);

    const count = affectedPatients(change, getDoctor()).length;
    const base = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
    const sms = buildSms(change, count, `${base}/m/${change.id}`);
    const result = await sendSms(sms);
    if (result.sent || result.mode === "preview") {
      await markNotified(change.id, sms, result.sent ? "twilio" : "preview");
    }
    return json(result);
  } catch {
    return json({ error: "We couldn't send that text. Try again." }, 500);
  }
}
