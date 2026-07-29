import Dexie, { type EntityTable } from "dexie";
import type { SyncTable } from "../sync/types";

export type ReadinessLevel = "ready" | "okay" | "tired";

export interface DailyLog {
  date: string; // YYYY-MM-DD
  water: number;
  sleep: number | null;
  weight: number | null;
  readiness: ReadinessLevel | null;
  restingHr: number | null;
  updatedAt?: string;
}

export interface SetLog {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  done: boolean;
  /** For finisher / zone2: minutes completed */
  minutes?: number | null;
  /** For sprint reps: time in seconds */
  timeSec?: number | null;
  note?: string;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
}

export interface SessionLog {
  id?: number;
  /** Stable UUID used as cloud primary key (assigned on first save) */
  syncId?: string;
  date: string;
  sessionId: string;
  week: number;
  startedAt: number;
  finishedAt: number | null;
  durationSec: number;
  exercises: ExerciseLog[];
  /** Zone2 / football / calisthenics extras */
  extras?: {
    zone2Minutes?: number;
    zone2AvgHr?: number;
    zone2DistanceKm?: number;
    zone2Notes?: string;
    drillsDone?: string[];
    sprintTimes?: number[];
    calisthenicsDone?: string[];
    mobilityDone?: string[];
    notes?: string;
  };
  totalVolume: number;
  setsLogged: number;
  prsHit: number;
  completed: boolean;
  updatedAt?: string;
}

export interface ExerciseHistory {
  exerciseId: string;
  last: { weight: number; reps: number; rpe: number | null; date: string };
  bestWeight: number;
  /** Estimated 1RM best (Epley) for PR detection */
  bestE1rm: number;
  updatedAt?: string;
}

export interface AppSettings {
  id: number; // always 1
  programStartDate: string; // YYYY-MM-DD (Monday of week 1)
  units: "metric";
  updatedAt?: string;
}

export interface WeekStatusRow {
  weekKey: string; // Monday YYYY-MM-DD
  /** Mon=0..Sun=6 → 'done' | 'partial' */
  status: Record<number, "done" | "partial">;
  updatedAt?: string;
}

/** Local-only outbox. Never mirrored to Supabase. */
export interface OutboxItem {
  id?: number;
  table: SyncTable;
  /** Natural / sync key used for dedupe (e.g. date, syncId, exerciseId) */
  rowId: string;
  payload: Record<string, unknown>;
  updatedAt: string;
  op: "upsert";
  attempts: number;
  lastError?: string;
}

export interface BodyCompLog {
  date: string;
  bodyFat: number | null;
  muscleMass: number | null;
  weight: number | null;
  notes?: string;
  updatedAt?: string;
}

export type PhotoPose = "front" | "side" | "back";

export interface ProgressPhoto {
  id: string;
  date: string;
  pose: PhotoPose;
  /** Compressed JPEG data URL — local only in Phase B */
  dataUrl: string;
  note?: string;
  createdAt: number;
}

export interface PlanGoalRow {
  /** week:YYYY-MM-DD (Monday) or month:YYYY-MM */
  periodKey: string;
  kind: "week" | "month";
  items: string[];
  updatedAt?: string;
}

export interface MilestoneProgress {
  milestoneId: string;
  status: "locked" | "active" | "done";
  note?: string;
  doneAt?: number | null;
  updatedAt?: string;
}

/** User edits to a strength session template (full exercise list replace). */
export interface SessionOverride {
  sessionId: string;
  exercises: import("../data/program").StrengthExercise[];
  updatedAt?: string;
}

/** In-progress workout draft — local only, survives refresh / back. */
export interface ActiveWorkoutDraft {
  /** `${date}:${sessionId}` */
  id: string;
  date: string;
  sessionId: string;
  week: number;
  startedAt: number;
  exerciseIdx: number;
  /** Strength set rows keyed by exerciseId */
  rows: Record<string, SetLog[]>;
  extras: {
    zone2Minutes?: string;
    zone2AvgHr?: string;
    zone2DistanceKm?: string;
    zone2Notes?: string;
    calis?: Record<string, boolean>;
    mobility?: Record<string, boolean>;
    cardioDone?: boolean;
    drillsDone?: Record<string, boolean>;
    sprintTimes?: string[];
    notes?: string;
  };
  sessionLog: { sets: number; volume: number; prs: number; prevVolume: number };
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function newSyncId(): string {
  return crypto.randomUUID();
}

class HybridAthleteDB extends Dexie {
  dailyLogs!: EntityTable<DailyLog, "date">;
  sessions!: EntityTable<SessionLog, "id">;
  exerciseHistory!: EntityTable<ExerciseHistory, "exerciseId">;
  settings!: EntityTable<AppSettings, "id">;
  weekStatus!: EntityTable<WeekStatusRow, "weekKey">;
  outbox!: EntityTable<OutboxItem, "id">;
  bodyComp!: EntityTable<BodyCompLog, "date">;
  photos!: EntityTable<ProgressPhoto, "id">;
  planGoals!: EntityTable<PlanGoalRow, "periodKey">;
  milestones!: EntityTable<MilestoneProgress, "milestoneId">;
  sessionOverrides!: EntityTable<SessionOverride, "sessionId">;
  activeWorkouts!: EntityTable<ActiveWorkoutDraft, "id">;

  constructor() {
    super("hybrid-athlete");
    this.version(1).stores({
      dailyLogs: "date",
      sessions: "++id, date, sessionId, week",
      exerciseHistory: "exerciseId",
      settings: "id",
      weekStatus: "weekKey",
    });
    this.version(2)
      .stores({
        dailyLogs: "date",
        sessions: "++id, syncId, date, sessionId, week",
        exerciseHistory: "exerciseId",
        settings: "id",
        weekStatus: "weekKey",
        outbox: "++id, [table+rowId], table, rowId, updatedAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("sessions")
          .toCollection()
          .modify((row: SessionLog) => {
            if (!row.syncId) row.syncId = crypto.randomUUID();
            if (!row.updatedAt) row.updatedAt = nowIso();
          });
      });
    this.version(3).stores({
      dailyLogs: "date",
      sessions: "++id, syncId, date, sessionId, week",
      exerciseHistory: "exerciseId",
      settings: "id",
      weekStatus: "weekKey",
      outbox: "++id, [table+rowId], table, rowId, updatedAt",
      bodyComp: "date",
      photos: "id, date, pose",
    });
    this.version(4).stores({
      dailyLogs: "date",
      sessions: "++id, syncId, date, sessionId, week",
      exerciseHistory: "exerciseId",
      settings: "id",
      weekStatus: "weekKey",
      outbox: "++id, [table+rowId], table, rowId, updatedAt",
      bodyComp: "date",
      photos: "id, date, pose",
      planGoals: "periodKey, kind",
    });
    this.version(5).stores({
      dailyLogs: "date",
      sessions: "++id, syncId, date, sessionId, week",
      exerciseHistory: "exerciseId",
      settings: "id",
      weekStatus: "weekKey",
      outbox: "++id, [table+rowId], table, rowId, updatedAt",
      bodyComp: "date",
      photos: "id, date, pose",
      planGoals: "periodKey, kind",
      milestones: "milestoneId, status",
    });
    this.version(6).stores({
      dailyLogs: "date",
      sessions: "++id, syncId, date, sessionId, week",
      exerciseHistory: "exerciseId",
      settings: "id",
      weekStatus: "weekKey",
      outbox: "++id, [table+rowId], table, rowId, updatedAt",
      bodyComp: "date",
      photos: "id, date, pose",
      planGoals: "periodKey, kind",
      milestones: "milestoneId, status",
      sessionOverrides: "sessionId",
    });
    this.version(7).stores({
      dailyLogs: "date",
      sessions: "++id, syncId, date, sessionId, week",
      exerciseHistory: "exerciseId",
      settings: "id",
      weekStatus: "weekKey",
      outbox: "++id, [table+rowId], table, rowId, updatedAt",
      bodyComp: "date",
      photos: "id, date, pose",
      planGoals: "periodKey, kind",
      milestones: "milestoneId, status",
      sessionOverrides: "sessionId",
      activeWorkouts: "id, date, sessionId",
    });
  }
}

export const db = new HybridAthleteDB();

type OutboxListener = () => void;
const outboxListeners = new Set<OutboxListener>();

/** Sync loop registers here so writes can trigger an immediate flush. */
export function onOutboxEnqueued(listener: OutboxListener): () => void {
  outboxListeners.add(listener);
  return () => {
    outboxListeners.delete(listener);
  };
}

function notifyOutbox(): void {
  for (const listener of outboxListeners) {
    try {
      listener();
    } catch {
      /* ignore listener errors */
    }
  }
}

/** Enqueue an upsert for background flush. Coalesces by table+rowId. */
export async function enqueueOutbox(
  table: SyncTable,
  rowId: string,
  payload: Record<string, unknown>,
  updatedAt: string = nowIso(),
): Promise<void> {
  const existing = await db.outbox.where("[table+rowId]").equals([table, rowId]).first();
  if (existing?.id != null) {
    await db.outbox.update(existing.id, {
      payload,
      updatedAt,
      op: "upsert",
      attempts: existing.attempts ?? 0,
      lastError: undefined,
    });
  } else {
    await db.outbox.add({
      table,
      rowId,
      payload,
      updatedAt,
      op: "upsert",
      attempts: 0,
    });
  }
  notifyOutbox();
}

/** Default: most recent Monday as program start (Week 1 begins then). */
export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(1);
  if (existing) return existing;
  const now = new Date();
  const day = now.getDay();
  const monOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + monOffset);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, "0");
  const d = String(mon.getDate()).padStart(2, "0");
  const updatedAt = nowIso();
  const row: AppSettings = {
    id: 1,
    programStartDate: `${y}-${m}-${d}`,
    units: "metric",
    updatedAt,
  };
  await db.settings.put(row);
  await enqueueOutbox("app_settings", "settings", {
    program_start_date: row.programStartDate,
    units: row.units,
    updated_at: updatedAt,
  }, updatedAt);
  return row;
}

export async function getDaily(date: string): Promise<DailyLog> {
  const row = await db.dailyLogs.get(date);
  return row ?? { date, water: 0, sleep: null, weight: null, readiness: null, restingHr: null };
}

export async function saveDaily(log: DailyLog): Promise<void> {
  const updatedAt = nowIso();
  const next = { ...log, updatedAt };
  await db.dailyLogs.put(next);
  await enqueueOutbox(
    "quick_logs",
    next.date,
    {
      date: next.date,
      water: next.water,
      sleep: next.sleep,
      weight: next.weight,
      readiness: next.readiness,
      resting_hr: next.restingHr,
      updated_at: updatedAt,
    },
    updatedAt,
  );
}

export async function getHistory(exerciseId: string): Promise<ExerciseHistory | undefined> {
  return db.exerciseHistory.get(exerciseId);
}

export async function upsertHistory(
  exerciseId: string,
  set: { weight: number; reps: number; rpe: number | null },
  date: string,
): Promise<{ isPR: boolean; history: ExerciseHistory }> {
  const e1rm = set.reps > 0 ? set.weight * (1 + set.reps / 30) : set.weight;
  const prev = await db.exerciseHistory.get(exerciseId);
  const bestWeight = Math.max(prev?.bestWeight ?? 0, set.weight);
  const bestE1rm = Math.max(prev?.bestE1rm ?? 0, e1rm);
  const isPR = !prev
    ? set.weight > 0
    : set.weight > (prev.bestWeight || 0) || e1rm > (prev.bestE1rm || 0) + 0.5;

  const updatedAt = nowIso();
  const history: ExerciseHistory = {
    exerciseId,
    last: { weight: set.weight, reps: set.reps, rpe: set.rpe, date },
    bestWeight,
    bestE1rm,
    updatedAt,
  };
  await db.exerciseHistory.put(history);
  await enqueueOutbox(
    "exercise_history",
    exerciseId,
    {
      exercise_id: exerciseId,
      last: history.last,
      best_weight: bestWeight,
      best_e1rm: bestE1rm,
      updated_at: updatedAt,
    },
    updatedAt,
  );
  return { isPR: Boolean(prev) && isPR, history };
}

export async function saveSession(log: SessionLog): Promise<number> {
  const updatedAt = nowIso();
  const syncId = log.syncId || newSyncId();
  const next: SessionLog = { ...log, syncId, updatedAt };
  const id = (await db.sessions.put(next)) as number;
  await enqueueOutbox(
    "workout_sessions",
    syncId,
    {
      id: syncId,
      date: next.date,
      session_id: next.sessionId,
      week: next.week,
      started_at: next.startedAt,
      finished_at: next.finishedAt,
      duration_sec: next.durationSec,
      exercises: next.exercises,
      extras: next.extras ?? null,
      total_volume: next.totalVolume,
      sets_logged: next.setsLogged,
      prs_hit: next.prsHit,
      completed: next.completed,
      updated_at: updatedAt,
    },
    updatedAt,
  );
  return id;
}

export async function getLastSessionVolume(sessionId: string): Promise<number> {
  const rows = await db.sessions
    .where("sessionId")
    .equals(sessionId)
    .filter((s) => s.completed)
    .reverse()
    .sortBy("finishedAt");
  const last = rows[rows.length - 1];
  return last?.totalVolume ?? 0;
}

export async function getWeekStatus(weekKey: string): Promise<Record<number, "done" | "partial">> {
  const row = await db.weekStatus.get(weekKey);
  return row?.status ?? {};
}

export async function markDayDone(
  weekKey: string,
  dayIdx: number,
  state: "done" | "partial" = "done",
): Promise<void> {
  const row = await db.weekStatus.get(weekKey);
  const status = { ...(row?.status ?? {}), [dayIdx]: state };
  const updatedAt = nowIso();
  await db.weekStatus.put({ weekKey, status, updatedAt });
  await enqueueOutbox(
    "week_status",
    weekKey,
    {
      week_key: weekKey,
      status,
      updated_at: updatedAt,
    },
    updatedAt,
  );
}
