import Dexie, { type EntityTable } from "dexie";

export type ReadinessLevel = "ready" | "okay" | "tired";

export interface DailyLog {
  date: string; // YYYY-MM-DD
  water: number;
  sleep: number | null;
  weight: number | null;
  readiness: ReadinessLevel | null;
  restingHr: number | null;
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
}

export interface ExerciseHistory {
  exerciseId: string;
  last: { weight: number; reps: number; rpe: number | null; date: string };
  bestWeight: number;
  /** Estimated 1RM best (Epley) for PR detection */
  bestE1rm: number;
}

export interface AppSettings {
  id: number; // always 1
  programStartDate: string; // YYYY-MM-DD (Monday of week 1)
  units: "metric";
}

export interface WeekStatusRow {
  weekKey: string; // Monday YYYY-MM-DD
  /** Mon=0..Sun=6 → 'done' | 'partial' */
  status: Record<number, "done" | "partial">;
}

class HybridAthleteDB extends Dexie {
  dailyLogs!: EntityTable<DailyLog, "date">;
  sessions!: EntityTable<SessionLog, "id">;
  exerciseHistory!: EntityTable<ExerciseHistory, "exerciseId">;
  settings!: EntityTable<AppSettings, "id">;
  weekStatus!: EntityTable<WeekStatusRow, "weekKey">;

  constructor() {
    super("hybrid-athlete");
    this.version(1).stores({
      dailyLogs: "date",
      sessions: "++id, date, sessionId, week",
      exerciseHistory: "exerciseId",
      settings: "id",
      weekStatus: "weekKey",
    });
  }
}

export const db = new HybridAthleteDB();

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
  const row: AppSettings = { id: 1, programStartDate: `${y}-${m}-${d}`, units: "metric" };
  await db.settings.put(row);
  return row;
}

export async function getDaily(date: string): Promise<DailyLog> {
  const row = await db.dailyLogs.get(date);
  return row ?? { date, water: 0, sleep: null, weight: null, readiness: null, restingHr: null };
}

export async function saveDaily(log: DailyLog): Promise<void> {
  await db.dailyLogs.put(log);
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

  const history: ExerciseHistory = {
    exerciseId,
    last: { weight: set.weight, reps: set.reps, rpe: set.rpe, date },
    bestWeight,
    bestE1rm,
  };
  await db.exerciseHistory.put(history);
  return { isPR: Boolean(prev) && isPR, history };
}

export async function saveSession(log: SessionLog): Promise<number> {
  return db.sessions.put(log) as Promise<number>;
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

export async function markDayDone(weekKey: string, dayIdx: number, state: "done" | "partial" = "done"): Promise<void> {
  const row = await db.weekStatus.get(weekKey);
  const status = { ...(row?.status ?? {}), [dayIdx]: state };
  await db.weekStatus.put({ weekKey, status });
}
