import type { ChangeType, CoverageRow, Direction } from "./types";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
] as const;

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const CHANGE_LABELS: Record<ChangeType, string> = {
  removed: "Coverage removed",
  tier_increase: "Higher tier",
  tier_decrease: "Lower tier",
  prior_authorization_added: "Prior authorization added",
  prior_authorization_removed: "Prior authorization removed",
  step_therapy_added: "Step therapy added",
  step_therapy_removed: "Step therapy removed",
  quantity_limit_added: "Quantity limit added",
  quantity_limit_removed: "Quantity limit removed",
};

export const ACTION_LABELS = {
  reviewed: "Marked reviewed",
  switched: "Switched medication",
  prior_auth_started: "Prior auth started",
} as const;

export function shortDrug(name: string): string {
  return name.split(" (")[0]?.trim() || name;
}

export function shortPlan(planName: string, insurer: string): string {
  let name = planName.trim();
  const prefix = `${insurer.trim()} `;
  if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
    name = name.slice(prefix.length);
  }
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function formatEstCost(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Unknown";
  return `est. $${value.toFixed(2)}/mo`;
}

export function formatBool(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "Unknown";
  return value ? "Yes" : "No";
}

export function formatTier(tier: number | null | undefined): string {
  if (tier === null || tier === undefined || Number.isNaN(tier)) return "Unknown";
  return `Tier ${tier}`;
}

export function coverageSummary(row: CoverageRow | null, notCovered = false): string {
  if (!row || notCovered || row.covered === false) return "Not covered";
  return `${formatTier(row.tier)} · ${formatEstCost(row.estMonthlyCost)}`;
}

export function monthYearFromCmsFile(file: string): { short: string; long: string } | null {
  const match = file.match(/(20\d{2})(\d{2})\d{2}/);
  if (!match) return null;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return {
    short: `${SHORT_MONTHS[monthIndex]} ${match[1]}`,
    long: `${LONG_MONTHS[monthIndex]} ${match[1]}`,
  };
}

export function longMonthYear(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  const monthIndex = Number(month) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11) return "the latest";
  return `${LONG_MONTHS[monthIndex]} ${year}`;
}

export function sourceChip(afterFile: string): string {
  const parsed = monthYearFromCmsFile(afterFile);
  return parsed ? `Source: CMS ${parsed.short} file` : "Source: CMS formulary file";
}

export function directionLabel(direction: Direction): string {
  return direction === "worsened" ? "Worsened" : "Improved";
}

export function isInsulin(drugName: string): boolean {
  return /insulin/i.test(drugName);
}
