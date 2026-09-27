import { interpretInbound, twimlMessage } from "@/lib/inbound";
import { applyInboundReview } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readBody(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = (await request.json().catch(() => ({}))) as { Body?: string; body?: string };
    return String(payload.Body ?? payload.body ?? "");
  }
  const form = await request.formData();
  return String(form.get("Body") ?? form.get("body") ?? "");
}

function xml(message: string) {
  return new Response(twimlMessage(message), {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  try {
    const text = await readBody(request);
    if (interpretInbound(text) !== "review") {
      return xml("Heads Up: reply 1 to mark the latest alert reviewed.");
    }
    const result = await applyInboundReview();
    return xml(
      result.ok ? "Heads Up: marked reviewed." : "Heads Up: no alert is waiting to be reviewed.",
    );
  } catch {
    return xml("Heads Up: we couldn't record that reply. Try again.");
  }
}
