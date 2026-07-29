import { db, enqueueOutbox, type PlanGoalRow } from "./index";
import { defaultMonthlyGoals, defaultWeeklyGoals } from "../data/program";

function nowIso(): string {
  return new Date().toISOString();
}

export function weekPeriodKey(weekMonday: string): string {
  return `week:${weekMonday}`;
}

export function monthPeriodKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `month:${y}-${m}`;
}

export async function getOrCreateWeekGoals(
  weekMonday: string,
  programWeek: number,
): Promise<PlanGoalRow> {
  const periodKey = weekPeriodKey(weekMonday);
  const existing = await db.planGoals.get(periodKey);
  if (existing) return existing;
  const row: PlanGoalRow = {
    periodKey,
    kind: "week",
    items: defaultWeeklyGoals(programWeek),
    updatedAt: nowIso(),
  };
  await db.planGoals.put(row);
  await enqueueGoal(row);
  return row;
}

export async function getOrCreateMonthGoals(
  monthKey: string,
  programWeek: number,
): Promise<PlanGoalRow> {
  const periodKey = monthKey.startsWith("month:") ? monthKey : `month:${monthKey}`;
  const existing = await db.planGoals.get(periodKey);
  if (existing) return existing;
  const row: PlanGoalRow = {
    periodKey,
    kind: "month",
    items: defaultMonthlyGoals(periodKey, programWeek),
    updatedAt: nowIso(),
  };
  await db.planGoals.put(row);
  await enqueueGoal(row);
  return row;
}

async function enqueueGoal(row: PlanGoalRow): Promise<void> {
  const updatedAt = row.updatedAt ?? nowIso();
  await enqueueOutbox(
    "plan_goals",
    row.periodKey,
    {
      period_key: row.periodKey,
      kind: row.kind,
      items: row.items,
      updated_at: updatedAt,
    },
    updatedAt,
  );
}

export async function saveGoalItems(
  periodKey: string,
  kind: "week" | "month",
  items: string[],
): Promise<PlanGoalRow> {
  const updatedAt = nowIso();
  const row: PlanGoalRow = { periodKey, kind, items, updatedAt };
  await db.planGoals.put(row);
  await enqueueGoal(row);
  return row;
}
