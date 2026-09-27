import { json } from "@/lib/http";
import { getChangeDetail } from "@/lib/present";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const includePatients = new URL(request.url).searchParams.get("names") !== "0";
    const detail = await getChangeDetail(id, includePatients);
    if (!detail) {
      return json({ error: "That change is not in the current CMS snapshots." }, 404);
    }
    return json(detail);
  } catch {
    return json({ error: "We couldn't load this change. Try again." }, 500);
  }
}
