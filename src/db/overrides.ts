import { db, enqueueOutbox, type SessionOverride } from "./index";
import {
  SESSIONS,
  type SessionDef,
  type StrengthExercise,
} from "../data/program";

function nowIso(): string {
  return new Date().toISOString();
}

export async function getSessionOverride(sessionId: string): Promise<SessionOverride | undefined> {
  return db.sessionOverrides.get(sessionId);
}

export async function saveSessionOverride(
  sessionId: string,
  exercises: StrengthExercise[],
): Promise<void> {
  const updatedAt = nowIso();
  const row: SessionOverride = { sessionId, exercises, updatedAt };
  await db.sessionOverrides.put(row);
  await enqueueOutbox(
    "session_overrides",
    sessionId,
    {
      session_id: sessionId,
      exercises,
      updated_at: updatedAt,
    },
    updatedAt,
  );
}

export async function clearSessionOverride(sessionId: string): Promise<void> {
  await db.sessionOverrides.delete(sessionId);
  // Upsert empty deleted state: remove remotely by writing empty with tombstone via delete isn't in outbox
  // Simplest: save program default as override reset isn't synced as delete —
  // enqueue a payload with exercises = base so remote matches reset.
  const base = SESSIONS[sessionId]?.exercises ?? [];
  const updatedAt = nowIso();
  await enqueueOutbox(
    "session_overrides",
    sessionId,
    {
      session_id: sessionId,
      exercises: base,
      updated_at: updatedAt,
    },
    updatedAt,
  );
}

/** Base program session with local edits applied (strength only). */
export async function getEffectiveSession(sessionId: string): Promise<SessionDef> {
  const base = SESSIONS[sessionId];
  if (!base) throw new Error(`Unknown session ${sessionId}`);
  if (base.kind !== "strength" || !base.exercises) return { ...base };
  const override = await getSessionOverride(sessionId);
  if (!override?.exercises?.length) return { ...base, exercises: [...base.exercises] };
  return { ...base, exercises: override.exercises.map((e) => ({ ...e })) };
}

export async function getEffectiveSessionForDay(mondayIdx: number): Promise<SessionDef> {
  const { WEEK_TEMPLATE } = await import("../data/program");
  return getEffectiveSession(WEEK_TEMPLATE[mondayIdx].sessionId);
}

export function isCustomized(sessionId: string, override?: SessionOverride): boolean {
  if (!override?.exercises) return false;
  const base = SESSIONS[sessionId]?.exercises ?? [];
  return JSON.stringify(base) !== JSON.stringify(override.exercises);
}
