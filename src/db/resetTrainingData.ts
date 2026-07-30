import { addDays, format, startOfWeek } from "date-fns";
import { db, enqueueOutbox, type AppSettings } from "./index";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

/** Next Monday = Week 1 start. If today is Monday, use today. */
export function upcomingProgramMonday(d = new Date()): string {
  const thisMon = startOfWeek(d, { weekStartsOn: 1 });
  if (d.getDay() === 1) return format(thisMon, "yyyy-MM-dd");
  return format(addDays(thisMon, 7), "yyyy-MM-dd");
}

const CLOUD_TABLES = [
  "quick_logs",
  "workout_sessions",
  "exercise_history",
  "week_status",
  "body_comp",
  "plan_goals",
  "milestones",
  "session_overrides",
  "app_settings",
] as const;

/**
 * Wipe logged/test training data locally (+ cloud for signed-in user).
 * Does NOT touch program definitions in code or auth account.
 */
export async function resetTrainingData(opts?: {
  /** YYYY-MM-DD Monday for Week 1. Defaults to upcoming Monday. */
  programStartDate?: string;
}): Promise<{ programStartDate: string; cloudCleared: boolean }> {
  const programStartDate = opts?.programStartDate ?? upcomingProgramMonday();

  // Stop pending sync of old rows
  await db.outbox.clear();

  await Promise.all([
    db.dailyLogs.clear(),
    db.sessions.clear(),
    db.exerciseHistory.clear(),
    db.weekStatus.clear(),
    db.bodyComp.clear(),
    db.photos.clear(),
    db.planGoals.clear(),
    db.milestones.clear(),
    db.sessionOverrides.clear(),
    db.activeWorkouts.clear(),
  ]);

  const updatedAt = new Date().toISOString();
  const settings: AppSettings = {
    id: 1,
    programStartDate,
    units: "metric",
    updatedAt,
  };
  await db.settings.put(settings);

  let cloudCleared = false;
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { data: sess } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    const userId = sess.session?.user.id;
    if (supabase && userId) {
      for (const table of CLOUD_TABLES) {
        await supabase.from(table).delete().eq("user_id", userId);
      }
      // Re-seed settings so multi-device stays aligned
      await supabase.from("app_settings").upsert({
        user_id: userId,
        program_start_date: programStartDate,
        units: "metric",
        updated_at: updatedAt,
      } as never);
      cloudCleared = true;
    }
  }

  // Also queue settings for outbox if offline / not signed in yet
  if (!cloudCleared) {
    await enqueueOutbox(
      "app_settings",
      "settings",
      {
        program_start_date: programStartDate,
        units: "metric",
        updated_at: updatedAt,
      },
      updatedAt,
    );
  }

  return { programStartDate, cloudCleared };
}
