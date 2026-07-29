import { db, type ActiveWorkoutDraft, type SetLog } from "./index";
import { todayKey } from "../lib/dates";

export function draftId(date: string, sessionId: string): string {
  return `${date}:${sessionId}`;
}

export async function getDraft(
  sessionId: string,
  date = todayKey(),
): Promise<ActiveWorkoutDraft | undefined> {
  return db.activeWorkouts.get(draftId(date, sessionId));
}

export async function getTodaysDraft(date = todayKey()): Promise<ActiveWorkoutDraft | undefined> {
  const rows = await db.activeWorkouts.where("date").equals(date).toArray();
  // Prefer most recently updated
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export async function saveDraft(draft: ActiveWorkoutDraft): Promise<void> {
  await db.activeWorkouts.put({
    ...draft,
    updatedAt: new Date().toISOString(),
  });
}

export async function clearDraft(sessionId: string, date = todayKey()): Promise<void> {
  await db.activeWorkouts.delete(draftId(date, sessionId));
}

export async function clearOldDrafts(keepDate = todayKey()): Promise<void> {
  await db.activeWorkouts.where("date").notEqual(keepDate).delete();
}

export async function upsertDraftPatch(
  base: Pick<ActiveWorkoutDraft, "id" | "date" | "sessionId" | "week" | "startedAt"> &
    Partial<ActiveWorkoutDraft>,
): Promise<void> {
  const existing = await db.activeWorkouts.get(base.id);
  const next: ActiveWorkoutDraft = {
    id: base.id,
    date: base.date,
    sessionId: base.sessionId,
    week: base.week,
    startedAt: base.startedAt ?? existing?.startedAt ?? Date.now(),
    exerciseIdx: base.exerciseIdx ?? existing?.exerciseIdx ?? 0,
    rows: base.rows ?? existing?.rows ?? {},
    extras: base.extras ?? existing?.extras ?? {},
    sessionLog: base.sessionLog ??
      existing?.sessionLog ?? { sets: 0, volume: 0, prs: 0, prevVolume: 0 },
    updatedAt: new Date().toISOString(),
  };
  await db.activeWorkouts.put(next);
}

export type { SetLog, ActiveWorkoutDraft };
