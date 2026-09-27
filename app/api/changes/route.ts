import { json } from "@/lib/http";
import { listChanges } from "@/lib/present";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return json(await listChanges());
  } catch {
    return json({ error: "We couldn't load coverage changes. Try again." }, 500);
  }
}
