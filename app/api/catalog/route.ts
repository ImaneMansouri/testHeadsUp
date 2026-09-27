import { catalogOptions } from "@/lib/data";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return json({ options: catalogOptions() });
}
