import { checkCmsCatalog } from "./cms";
import { compareSnapshots } from "./compare";
import { getDoctor, getSnapshots } from "./data";
import { watchCounts, type WatchCounts } from "./stats";
import type { Change, WatchStep } from "./types";

function elapsed(start: number): number {
  return Math.max(0, Math.round(performance.now() - start));
}

function plural(count: number, singular: string, pluralLabel: string): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

export async function runWatch(options?: {
  cmsTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<{ steps: WatchStep[]; changes: Change[]; counts: WatchCounts }> {
  const steps: WatchStep[] = [];
  const { before, after } = getSnapshots();
  const doctor = getDoctor();

  const catalogStart = performance.now();
  const catalogLabel = await checkCmsCatalog(options?.cmsTimeoutMs ?? 5000, options?.fetchImpl ?? fetch);
  steps.push({ label: catalogLabel, ms: elapsed(catalogStart) });

  const beforeStart = performance.now();
  steps.push({
    label: `Loaded snapshot ${before.id}: ${before.rows.length} rows (CMS Q2 2026)`,
    ms: elapsed(beforeStart),
  });

  const afterStart = performance.now();
  steps.push({
    label: `Loaded snapshot ${after.id}: ${after.rows.length} rows (CMS Sept 2026)`,
    ms: elapsed(afterStart),
  });

  const compareStart = performance.now();
  const changes = compareSnapshots(before, after);
  const counts = watchCounts(before, after, changes, doctor);
  steps.push({
    label: `Compared ${counts.pairs} plan/drug pairs: ${plural(changes.length, "change", "changes")} detected`,
    ms: elapsed(compareStart),
  });

  const matchStart = performance.now();
  steps.push({
    label: `Matched to ${doctor.name}'s panel: ${plural(counts.patients, "patient", "patients")} affected`,
    ms: elapsed(matchStart),
  });

  return { steps, changes, counts };
}
