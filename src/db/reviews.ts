import { format, parseISO, startOfWeek, subDays } from "date-fns";
import { db } from "./index";
import { todayKey } from "../lib/dates";

export interface PeriodReview {
  periodKey: string;
  kind: "week" | "month";
  headline: string;
  bullets: string[];
  sessionsCompleted: number;
  volumeKg: number;
  prs: number;
  avgReadiness: number | null;
  generatedAt: string;
}

function readinessNum(r: string | null): number | null {
  if (r === "ready") return 88;
  if (r === "okay") return 64;
  if (r === "tired") return 38;
  return null;
}

export async function buildWeekReview(anchor = new Date()): Promise<PeriodReview> {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  const monKey = format(monday, "yyyy-MM-dd");
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(format(d, "yyyy-MM-dd"));
  }

  const sessions = (await db.sessions.toArray()).filter(
    (s) => s.completed && days.includes(s.date),
  );
  const dailies = await db.dailyLogs.bulkGet(days);
  const readinessVals = dailies
    .filter(Boolean)
    .map((d) => readinessNum(d!.readiness))
    .filter((n): n is number => n != null);
  const avgReadiness =
    readinessVals.length > 0
      ? Math.round(readinessVals.reduce((a, b) => a + b, 0) / readinessVals.length)
      : null;

  const volumeKg = Math.round(sessions.reduce((a, s) => a + (s.totalVolume || 0), 0));
  const prs = sessions.reduce((a, s) => a + (s.prsHit || 0), 0);
  const byType: Record<string, number> = {};
  for (const s of sessions) byType[s.sessionId] = (byType[s.sessionId] ?? 0) + 1;

  const bullets: string[] = [];
  bullets.push(
    sessions.length === 0
      ? "No sessions logged this week yet — open when you’re ready, not to catch up."
      : `${sessions.length} session${sessions.length === 1 ? "" : "s"} logged · ${volumeKg.toLocaleString()} kg volume`,
  );
  if (prs > 0) bullets.push(`${prs} PR flag${prs === 1 ? "" : "s"} this week — keep the ones that felt clean.`);
  if (avgReadiness != null) {
    bullets.push(
      avgReadiness >= 72
        ? `Readiness averaged ~${avgReadiness} — solid recovery window.`
        : avgReadiness >= 48
          ? `Readiness averaged ~${avgReadiness} — train smart, watch cumulative fatigue.`
          : `Readiness averaged ~${avgReadiness} — protect sleep; volume can wait.`,
    );
  }
  const zone2 = sessions.filter((s) => s.sessionId === "zone2").length;
  if (zone2 > 0) bullets.push(`${zone2} Zone 2 block${zone2 === 1 ? "" : "s"} — aerobic base compounding.`);
  const football = sessions.filter((s) => s.sessionId === "football").length;
  if (football > 0) bullets.push("Football conditioning logged — note gassing onset next time.");
  if (sessions.length >= 5) bullets.push("High consistency this week. Quiet win.");

  const headline =
    sessions.length === 0
      ? "Quiet week so far"
      : sessions.length >= 5
        ? "Strong consistency week"
        : prs > 0
          ? "Progress showed up in the numbers"
          : "Training happened — that’s the point";

  return {
    periodKey: `week:${monKey}`,
    kind: "week",
    headline,
    bullets,
    sessionsCompleted: sessions.length,
    volumeKg,
    prs,
    avgReadiness,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildMonthReview(anchor = new Date()): Promise<PeriodReview> {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
  const sessions = (await db.sessions.toArray()).filter(
    (s) => s.completed && s.date.startsWith(prefix),
  );
  const comps = (await db.bodyComp.toArray()).filter((c) => c.date.startsWith(prefix));
  const volumeKg = Math.round(sessions.reduce((a, s) => a + (s.totalVolume || 0), 0));
  const prs = sessions.reduce((a, s) => a + (s.prsHit || 0), 0);

  const fatPts = comps.filter((c) => c.bodyFat != null).map((c) => c.bodyFat as number);
  const bullets: string[] = [
    `${sessions.length} sessions · ${volumeKg.toLocaleString()} kg volume · ${prs} PR flags`,
  ];
  if (fatPts.length >= 2) {
    const delta = fatPts[fatPts.length - 1] - fatPts[0];
    bullets.push(
      delta < -0.2
        ? `Body fat trend down ~${Math.abs(delta).toFixed(1)}% across scans this month.`
        : delta > 0.2
          ? `Body fat up ~${delta.toFixed(1)}% — normal noise under recomp; watch photos + muscle mass.`
          : "Body fat basically flat — classic recomp signature.",
    );
  } else if (comps.length === 0) {
    bullets.push("No Tanita scan logged this month — next one is useful for the story.");
  } else {
    bullets.push(`Latest scan BF ${fatPts[0]?.toFixed(1) ?? "—"}%.`);
  }

  // Last 14 days readiness for monthly vibe
  const recentKeys: string[] = [];
  for (let i = 13; i >= 0; i--) recentKeys.push(todayKey(subDays(anchor, i)));
  const dailies = await db.dailyLogs.bulkGet(recentKeys);
  const rVals = dailies
    .filter(Boolean)
    .map((d) => readinessNum(d!.readiness))
    .filter((n): n is number => n != null);
  const avgReadiness =
    rVals.length > 0 ? Math.round(rVals.reduce((a, b) => a + b, 0) / rVals.length) : null;
  if (avgReadiness != null) {
    bullets.push(`Recent readiness ~${avgReadiness} (last 2 weeks of check-ins).`);
  }
  bullets.push("Reflect: what felt hard, what felt easy — adjust next block from data.");

  return {
    periodKey: `month:${prefix}`,
    kind: "month",
    headline: sessions.length >= 12 ? "Month had real training density" : "Month in progress",
    bullets,
    sessionsCompleted: sessions.length,
    volumeKg,
    prs,
    avgReadiness,
    generatedAt: new Date().toISOString(),
  };
}

/** Current + best calm consistency: consecutive days with any completed session or check-in */
export async function consistencyStats(): Promise<{ current: number; best: number; loggedDays: number }> {
  const sessions = await db.sessions.filter((s) => s.completed).toArray();
  const days = new Set(sessions.map((s) => s.date));
  const dailies = await db.dailyLogs.toArray();
  for (const d of dailies) {
    if (d.readiness || d.water > 0 || d.weight != null || d.sleep != null) days.add(d.date);
  }
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    if (prev) {
      const prevD = parseISO(prev);
      const cur = parseISO(day);
      const diff = Math.round((cur.getTime() - prevD.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = day;
  }

  // current streak ending today or yesterday (don't punish missing today if not done yet)
  let current = 0;
  let cursor = parseISO(todayKey());
  for (let i = 0; i < 400; i++) {
    const key = format(cursor, "yyyy-MM-dd");
    if (days.has(key)) {
      current += 1;
      cursor = subDays(cursor, 1);
    } else if (i === 0) {
      // today empty — check yesterday without resetting shame
      cursor = subDays(cursor, 1);
    } else break;
  }

  return { current, best, loggedDays: days.size };
}
