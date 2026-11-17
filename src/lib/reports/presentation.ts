import { ghanaCalendarDate } from "@/lib/payments/presentation";
import type { ReportPeriodPreset } from "./schemas";

export { ghanaCalendarDate };

export type ResolvedReportPeriod = {
  fromDate: string;
  toDate: string;
  label: string;
};

/** Shift a YYYY-MM-DD Ghana calendar date by a whole number of days. */
export function shiftGhanaDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day + days, 12, 0, 0);
  return ghanaCalendarDate(new Date(utc));
}

export function startOfGhanaMonth(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return `${year}-${month}-01`;
}

export function endOfGhanaMonth(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  const lastDayUtc = Date.UTC(year, month, 0, 12, 0, 0);
  return ghanaCalendarDate(new Date(lastDayUtc));
}

export function resolveReportPeriod(
  preset: ReportPeriodPreset,
  customFrom = "",
  customTo = "",
  now: Date = new Date(),
): ResolvedReportPeriod {
  const today = ghanaCalendarDate(now);

  switch (preset) {
    case "today":
      return { fromDate: today, toDate: today, label: "Today" };
    case "yesterday": {
      const yesterday = shiftGhanaDate(today, -1);
      return { fromDate: yesterday, toDate: yesterday, label: "Yesterday" };
    }
    case "last_7_days":
      return {
        fromDate: shiftGhanaDate(today, -6),
        toDate: today,
        label: "Last 7 days",
      };
    case "last_30_days":
      return {
        fromDate: shiftGhanaDate(today, -29),
        toDate: today,
        label: "Last 30 days",
      };
    case "this_month":
      return {
        fromDate: startOfGhanaMonth(today),
        toDate: today,
        label: "This month",
      };
    case "last_month": {
      const lastMonthAnchor = shiftGhanaDate(startOfGhanaMonth(today), -1);
      return {
        fromDate: startOfGhanaMonth(lastMonthAnchor),
        toDate: endOfGhanaMonth(lastMonthAnchor),
        label: "Last month",
      };
    }
    case "custom": {
      const fromDate = customFrom || today;
      const toDate = customTo || customFrom || today;
      const ordered =
        fromDate <= toDate
          ? { fromDate, toDate }
          : { fromDate: toDate, toDate: fromDate };
      return {
        ...ordered,
        label: `${ordered.fromDate} → ${ordered.toDate}`,
      };
    }
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export function formatReportDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(`${value.slice(0, 10)}T00:00:00Z`),
    );
  } catch {
    return value;
  }
}

export function formatReportQuantity(value: number): string {
  return new Intl.NumberFormat("en-GH").format(value);
}

export const REPORT_PERIOD_OPTIONS: {
  value: ReportPeriodPreset;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];
