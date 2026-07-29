export type MilestoneStatus = "locked" | "active" | "done";

export interface MilestoneDef {
  id: string;
  title: string;
  detail: string;
  /** Program phase when this becomes realistic */
  phase: 1 | 2 | 3;
}

/** Real roadmap markers — not login badges */
export const MILESTONES: MilestoneDef[] = [
  {
    id: "baseline-3km",
    title: "Baseline 3km time trial",
    detail: "Record Week 1 so Week 12 has a number to beat.",
    phase: 1,
  },
  {
    id: "dead-hang-20",
    title: "Dead hang 20s × 3",
    detail: "Grip + shoulder integrity base for pull-ups.",
    phase: 1,
  },
  {
    id: "zone2-habit",
    title: "4 straight Wed Zone 2 sessions",
    detail: "Aerobic base is your primary limiter — consistency beats hero days.",
    phase: 1,
  },
  {
    id: "first-pullup",
    title: "First unassisted pull-up",
    detail: "Realistic Week 12 target: 1–3 clean reps, not a set of 10.",
    phase: 2,
  },
  {
    id: "pushup-full",
    title: "3×8 full push-ups (clean)",
    detail: "Graduate from incline/knee once form is honest.",
    phase: 2,
  },
  {
    id: "lsit-tuck",
    title: "Tuck L-sit 15s hold",
    detail: "Prerequisite before full L-sit attempts in Phase 3.",
    phase: 2,
  },
  {
    id: "rsa-dropoff",
    title: "RSA fatigue index improves",
    detail: "Curved treadmill: smaller drop-off from rep 1 → last rep.",
    phase: 2,
  },
  {
    id: "full-lsit",
    title: "Full L-sit ~5s",
    detail: "Phase 3 only — don't force hips earlier.",
    phase: 3,
  },
  {
    id: "week12-retest",
    title: "Week 12 full retest",
    detail: "3km TT, 10×15s RSA, Tanita, photos, top-set loads vs Week 1.",
    phase: 3,
  },
  {
    id: "gas-later",
    title: "Gassing onset later in football",
    detail: "Subjective but clearest sport-specific proof — note it after each match.",
    phase: 3,
  },
];
