export const CMS_CATALOG_URL = "https://data.cms.gov/data.json";
export const FORMULARY_TITLE = "Monthly Prescription Drug Plan Formulary and Pharmacy Network Information";
export const CMS_FALLBACK = "CMS catalog unreachable, using cached release 2026_20260916.zip";

export function findFormularyModified(catalog: unknown): string | null {
  if (!catalog || typeof catalog !== "object") return null;
  const dataset = (catalog as { dataset?: unknown }).dataset;
  if (!Array.isArray(dataset)) return null;
  for (const item of dataset) {
    if (!item || typeof item !== "object") continue;
    const record = item as { title?: unknown; modified?: unknown };
    if (typeof record.title !== "string") continue;
    if (record.title.toLowerCase() !== FORMULARY_TITLE.toLowerCase()) continue;
    return typeof record.modified === "string" ? record.modified : null;
  }
  return null;
}

export async function checkCmsCatalog(
  timeoutMs = 5000,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(CMS_CATALOG_URL, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return CMS_FALLBACK;
    const modified = findFormularyModified(await response.json());
    if (!modified) {
      return "Checking CMS data catalog: dataset not found, using cached release 2026_20260916.zip";
    }
    return `Checking CMS data catalog: latest modified ${modified}`;
  } catch {
    return CMS_FALLBACK;
  } finally {
    clearTimeout(timer);
  }
}
