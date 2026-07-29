import type { DailyLog, ReadinessLevel } from "../db";

export interface ReadinessResult {
  score: number;
  label: "Ready" | "Okay" | "Tired" | "Unknown";
  /** Soft coach note — never guilt */
  tip: string;
  parts: {
    subjective: number | null;
    sleep: number | null;
    hrTrend: number | null;
  };
}

/**
 * Combines subjective check-in + sleep + resting-HR trend into one score.
 * Rising RHR over recent mornings flags fatigue (warning color path).
 */
export function computeReadiness(
  today: Pick<DailyLog, "readiness" | "sleep" | "restingHr">,
  recentMornings: Pick<DailyLog, "date" | "restingHr">[] = [],
): ReadinessResult {
  const map: Record<ReadinessLevel, number> = { ready: 88, okay: 64, tired: 38 };
  const subjective = today.readiness ? map[today.readiness] : null;

  let sleepAdj = 0;
  let sleepPart: number | null = null;
  if (today.sleep != null) {
    // Peak around 7.5–9h; both short and very long sleep dampen slightly
    const s = today.sleep;
    sleepAdj = Math.min(12, Math.max(-14, (s - 7.5) * 6));
    if (s > 9.5) sleepAdj -= (s - 9.5) * 4;
    sleepPart = Math.round(Math.min(100, Math.max(0, 70 + sleepAdj)));
  }

  let hrAdj = 0;
  let hrPart: number | null = null;
  const hrs = recentMornings
    .filter((d) => d.restingHr != null && d.restingHr > 0)
    .map((d) => d.restingHr as number);
  if (today.restingHr != null && today.restingHr > 0 && hrs.length >= 3) {
    const prior = hrs.slice(0, -1); // exclude today if last
    const baseline = prior.reduce((a, b) => a + b, 0) / prior.length;
    const delta = today.restingHr - baseline;
    // +3 bpm or more vs baseline → fatigue
    hrAdj = Math.min(8, Math.max(-16, -delta * 2.5));
    hrPart = Math.round(Math.min(100, Math.max(0, 72 + hrAdj)));
  } else if (today.restingHr != null) {
    hrPart = 70;
  }

  const base = subjective ?? 70;
  const score = Math.round(Math.min(98, Math.max(18, base + sleepAdj + hrAdj)));

  const label =
    today.readiness == null && today.sleep == null
      ? "Unknown"
      : score >= 72
        ? "Ready"
        : score >= 48
          ? "Okay"
          : "Tired";

  let tip = "Check in when you can — score gets sharper with sleep + morning HR.";
  if (label === "Tired") {
    tip = "Recovery flag — keep quality, maybe drop a set or swap intensity. Not a miss.";
  } else if (label === "Okay") {
    tip = "Solid enough. Train as planned; watch RPE drift upward.";
  } else if (label === "Ready") {
    tip = "Good window for progressive overload on key lifts.";
  }
  if (hrAdj <= -8) {
    tip = "Resting HR elevated vs your recent mornings — treat today as easier.";
  }

  return {
    score,
    label,
    tip,
    parts: { subjective, sleep: sleepPart, hrTrend: hrPart },
  };
}
