import { json } from "@/lib/http";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const state = await getState();
    return json({ runs: state.runs });
  } catch {
    return json({ error: "We couldn't load watch history. Try again." }, 500);
  }
}
