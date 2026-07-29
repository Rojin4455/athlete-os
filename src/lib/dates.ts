import { differenceInCalendarWeeks, startOfWeek, format, parseISO } from "date-fns";

/** YYYY-MM-DD in local time */
export function todayKey(d = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

/** Mon=0 .. Sun=6 */
export function mondayIndexOf(d = new Date()): number {
  const jsDay = d.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function fmtClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Program week 1–12 from start date (Monday of week 1). Clamped. */
export function programWeek(startDateIso: string, d = new Date()): number {
  const start = startOfWeek(parseISO(startDateIso), { weekStartsOn: 1 });
  const current = startOfWeek(d, { weekStartsOn: 1 });
  const w = differenceInCalendarWeeks(current, start, { weekStartsOn: 1 }) + 1;
  return Math.min(12, Math.max(1, w));
}

export function phaseForWeek(week: number): "Foundation" | "Build" | "Intensify" {
  if (week <= 4) return "Foundation";
  if (week <= 8) return "Build";
  return "Intensify";
}

export function weekStartKey(d = new Date()): string {
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}
