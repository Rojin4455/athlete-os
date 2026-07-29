import {
  db,
  enqueueOutbox,
  newSyncId,
  type BodyCompLog,
  type ExerciseHistory,
  type PhotoPose,
  type ProgressPhoto,
  type SessionLog,
} from "./index";

export type { BodyCompLog, PhotoPose, ProgressPhoto };

function nowIso(): string {
  return new Date().toISOString();
}

export async function listBodyComp(): Promise<BodyCompLog[]> {
  return db.bodyComp.orderBy("date").toArray();
}

export async function saveBodyComp(log: BodyCompLog): Promise<void> {
  const updatedAt = nowIso();
  const next = { ...log, updatedAt };
  await db.bodyComp.put(next);
  await enqueueOutbox(
    "body_comp",
    next.date,
    {
      date: next.date,
      body_fat: next.bodyFat,
      muscle_mass: next.muscleMass,
      weight: next.weight,
      notes: next.notes ?? null,
      updated_at: updatedAt,
    },
    updatedAt,
  );

  // Mirror scan weight into daily quick-log so Today + weight chart stay in sync
  if (next.weight != null && next.weight > 0) {
    const daily = (await db.dailyLogs.get(next.date)) ?? {
      date: next.date,
      water: 0,
      sleep: null,
      weight: null,
      readiness: null,
      restingHr: null,
    };
    await db.dailyLogs.put({ ...daily, weight: next.weight, updatedAt });
    await enqueueOutbox(
      "quick_logs",
      next.date,
      {
        date: next.date,
        water: daily.water,
        sleep: daily.sleep,
        weight: next.weight,
        readiness: daily.readiness,
        resting_hr: daily.restingHr,
        updated_at: updatedAt,
      },
      updatedAt,
    );
  }
}

export async function deleteBodyComp(date: string): Promise<void> {
  await db.bodyComp.delete(date);
}

export async function listPhotos(): Promise<ProgressPhoto[]> {
  return db.photos.orderBy("date").reverse().toArray();
}

export async function addPhoto(input: {
  date: string;
  pose: PhotoPose;
  dataUrl: string;
  note?: string;
}): Promise<ProgressPhoto> {
  const row: ProgressPhoto = {
    id: newSyncId(),
    date: input.date,
    pose: input.pose,
    dataUrl: input.dataUrl,
    note: input.note,
    createdAt: Date.now(),
  };
  await db.photos.put(row);
  return row;
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}

export async function listWeightSeries(): Promise<{ date: string; weight: number }[]> {
  const [dailies, comps] = await Promise.all([
    db.dailyLogs.orderBy("date").toArray(),
    db.bodyComp.orderBy("date").toArray(),
  ]);

  // Prefer daily scale logs; fill gaps from Tanita body-comp weight
  const byDate = new Map<string, number>();
  for (const c of comps) {
    if (c.weight != null && c.weight > 0) byDate.set(c.date, c.weight);
  }
  for (const r of dailies) {
    if (r.weight != null && r.weight > 0) byDate.set(r.date, r.weight);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weight]) => ({ date, weight }));
}

/** 7-day trailing average aligned to each weight sample date */
export function rollingAvg7(
  series: { date: string; weight: number }[],
): { date: string; avg: number }[] {
  return series.map((point, i) => {
    const window = series.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, p) => s + p.weight, 0) / window.length;
    return { date: point.date, avg };
  });
}

export interface LiftPoint {
  date: string;
  weight: number;
  reps: number;
  rpe: number | null;
}

/** Top working set (highest weight, then reps) per session for one lift */
export async function liftSeries(exerciseId: string): Promise<LiftPoint[]> {
  const sessions = await db.sessions.filter((s) => s.completed).toArray();
  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.startedAt - b.startedAt);
  const points: LiftPoint[] = [];
  for (const s of sessions) {
    const ex = s.exercises?.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    let best: LiftPoint | null = null;
    for (const set of ex.sets) {
      if (!set.done || set.weight == null || set.weight <= 0) continue;
      const reps = set.reps ?? 0;
      if (
        !best ||
        set.weight > best.weight ||
        (set.weight === best.weight && reps > best.reps)
      ) {
        best = { date: s.date, weight: set.weight, reps, rpe: set.rpe };
      }
    }
    if (best) points.push(best);
  }
  return points;
}

export async function allPrs(): Promise<ExerciseHistory[]> {
  const rows = await db.exerciseHistory.toArray();
  return rows
    .filter((r) => r.bestWeight > 0)
    .sort((a, b) => b.bestWeight - a.bestWeight || b.bestE1rm - a.bestE1rm);
}

export async function progressStats(): Promise<{
  latestWeight: number | null;
  latestBodyFat: number | null;
  sessionsLogged: number;
  prCount: number;
}> {
  const weights = await listWeightSeries();
  const comps = await listBodyComp();
  const sessions = await db.sessions.filter((s) => s.completed).count();
  const prs = await allPrs();
  const lastFat = [...comps].reverse().find((c) => c.bodyFat != null)?.bodyFat ?? null;
  return {
    latestWeight: weights.length ? weights[weights.length - 1].weight : null,
    latestBodyFat: lastFat,
    sessionsLogged: sessions,
    prCount: prs.length,
  };
}

export async function compressImageFile(file: File, maxEdge = 1200, quality = 0.72): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

export type { SessionLog };
