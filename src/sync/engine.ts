import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { db, type DailyLog, type ExerciseHistory, type SessionLog, type WeekStatusRow } from "../db";
import type { SyncTable } from "./types";

let flushing = false;

async function requireUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Push pending Dexie outbox rows to Supabase (latest-wins via upsert). */
export async function flushOutbox(): Promise<{ flushed: number; failed: number }> {
  if (!isSupabaseConfigured() || flushing) return { flushed: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { flushed: 0, failed: 0 };
  }

  const supabase = getSupabase();
  const userId = await requireUserId();
  if (!supabase || !userId) return { flushed: 0, failed: 0 };

  flushing = true;
  let flushed = 0;
  let failed = 0;

  try {
    const items = await db.outbox.orderBy("id").toArray();
    for (const item of items) {
      if (item.id == null) continue;
      const row = { ...item.payload, user_id: userId };
      const { error } = await supabase.from(item.table).upsert(row as never);
      if (error) {
        failed += 1;
        await db.outbox.update(item.id, {
          attempts: (item.attempts ?? 0) + 1,
          lastError: error.message,
        });
        continue;
      }
      await db.outbox.delete(item.id);
      flushed += 1;
    }
  } finally {
    flushing = false;
  }

  return { flushed, failed };
}

function newer(remoteIso: string | undefined, localIso: string | undefined): boolean {
  if (!remoteIso) return false;
  if (!localIso) return true;
  return Date.parse(remoteIso) > Date.parse(localIso);
}

/** Pull remote rows and merge into Dexie using updated_at (latest wins). */
export async function pullRemote(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const supabase = getSupabase();
  const userId = await requireUserId();
  if (!supabase || !userId) return;

  const tables: SyncTable[] = [
    "quick_logs",
    "workout_sessions",
    "exercise_history",
    "week_status",
    "app_settings",
    "body_comp",
    "plan_goals",
    "milestones",
    "session_overrides",
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
    if (error || !data) continue;

    for (const remote of data) {
      switch (table) {
        case "quick_logs": {
          const r = remote as {
            date: string;
            water: number;
            sleep: number | null;
            weight: number | null;
            readiness: DailyLog["readiness"];
            resting_hr: number | null;
            updated_at: string;
          };
          const local = await db.dailyLogs.get(r.date);
          if (!newer(r.updated_at, local?.updatedAt)) break;
          const row: DailyLog = {
            date: r.date,
            water: r.water,
            sleep: r.sleep,
            weight: r.weight,
            readiness: r.readiness,
            restingHr: r.resting_hr,
            updatedAt: r.updated_at,
          };
          await db.dailyLogs.put(row);
          break;
        }
        case "workout_sessions": {
          const r = remote as {
            id: string;
            date: string;
            session_id: string;
            week: number;
            started_at: number;
            finished_at: number | null;
            duration_sec: number;
            exercises: SessionLog["exercises"];
            extras: SessionLog["extras"] | null;
            total_volume: number;
            sets_logged: number;
            prs_hit: number;
            completed: boolean;
            updated_at: string;
          };
          const local = await db.sessions.where("syncId").equals(r.id).first();
          if (!newer(r.updated_at, local?.updatedAt)) break;
          const merged: SessionLog = {
            ...(local?.id != null ? { id: local.id } : {}),
            syncId: r.id,
            date: r.date,
            sessionId: r.session_id,
            week: r.week,
            startedAt: r.started_at,
            finishedAt: r.finished_at,
            durationSec: r.duration_sec,
            exercises: r.exercises ?? [],
            extras: r.extras ?? undefined,
            totalVolume: r.total_volume,
            setsLogged: r.sets_logged,
            prsHit: r.prs_hit,
            completed: r.completed,
            updatedAt: r.updated_at,
          };
          await db.sessions.put(merged);
          break;
        }
        case "exercise_history": {
          const r = remote as {
            exercise_id: string;
            last: ExerciseHistory["last"];
            best_weight: number;
            best_e1rm: number;
            updated_at: string;
          };
          const local = await db.exerciseHistory.get(r.exercise_id);
          if (!newer(r.updated_at, local?.updatedAt)) break;
          await db.exerciseHistory.put({
            exerciseId: r.exercise_id,
            last: r.last,
            bestWeight: r.best_weight,
            bestE1rm: r.best_e1rm,
            updatedAt: r.updated_at,
          });
          break;
        }
        case "week_status": {
          const r = remote as {
            week_key: string;
            status: WeekStatusRow["status"];
            updated_at: string;
          };
          const local = await db.weekStatus.get(r.week_key);
          if (!newer(r.updated_at, local?.updatedAt)) break;
          await db.weekStatus.put({
            weekKey: r.week_key,
            status: r.status ?? {},
            updatedAt: r.updated_at,
          });
          break;
        }
        case "app_settings": {
          const r = remote as {
            program_start_date: string;
            units: string;
            updated_at: string;
          };
          const local = await db.settings.get(1);
          if (!newer(r.updated_at, local?.updatedAt)) break;
          await db.settings.put({
            id: 1,
            programStartDate: r.program_start_date,
            units: "metric",
            updatedAt: r.updated_at,
          });
          break;
        }
        case "body_comp": {
          const r = remote as {
            date: string;
            body_fat: number | null;
            muscle_mass: number | null;
            weight: number | null;
            notes: string | null;
            updated_at: string;
          };
          const local = await db.bodyComp.get(r.date);
          if (!newer(r.updated_at, local?.updatedAt)) break;
          await db.bodyComp.put({
            date: r.date,
            bodyFat: r.body_fat,
            muscleMass: r.muscle_mass,
            weight: r.weight,
            notes: r.notes ?? undefined,
            updatedAt: r.updated_at,
          });
          break;
        }
        case "plan_goals": {
          const r = remote as {
            period_key: string;
            kind: "week" | "month";
            items: string[];
            updated_at: string;
          };
          const local = await db.planGoals.get(r.period_key);
          if (!newer(r.updated_at, local?.updatedAt)) break;
          await db.planGoals.put({
            periodKey: r.period_key,
            kind: r.kind,
            items: Array.isArray(r.items) ? r.items : [],
            updatedAt: r.updated_at,
          });
          break;
        }
        case "milestones": {
          const r = remote as {
            milestone_id: string;
            status: "locked" | "active" | "done";
            note: string | null;
            done_at: string | null;
            updated_at: string;
          };
          const local = await db.milestones.get(r.milestone_id);
          if (!newer(r.updated_at, local?.updatedAt)) break;
          await db.milestones.put({
            milestoneId: r.milestone_id,
            status: r.status,
            note: r.note ?? undefined,
            doneAt: r.done_at ? Date.parse(r.done_at) : null,
            updatedAt: r.updated_at,
          });
          break;
        }
        case "session_overrides": {
          const r = remote as {
            session_id: string;
            exercises: import("../data/program").StrengthExercise[];
            updated_at: string;
          };
          const local = await db.sessionOverrides.get(r.session_id);
          if (!newer(r.updated_at, local?.updatedAt)) break;
          const base = (await import("../data/program")).SESSIONS[r.session_id]?.exercises ?? [];
          // If remote equals program default, drop local override
          if (JSON.stringify(r.exercises) === JSON.stringify(base)) {
            await db.sessionOverrides.delete(r.session_id);
          } else {
            await db.sessionOverrides.put({
              sessionId: r.session_id,
              exercises: r.exercises ?? [],
              updatedAt: r.updated_at,
            });
          }
          break;
        }
      }
    }
  }
}

export async function syncNow(): Promise<void> {
  await flushOutbox();
  await pullRemote();
  // Re-flush in case local writes landed during pull (rare)
  await flushOutbox();
}
