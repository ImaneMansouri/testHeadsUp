import { json } from "@/lib/http";
import { resetDemo } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    await resetDemo();
    return json({ ok: true });
  } catch {
    return json({ error: "We couldn't reset the demo. Try again." }, 500);
  }
}
