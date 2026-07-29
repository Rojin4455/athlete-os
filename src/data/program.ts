/** Full 12-week program data sourced from Rojin_12_Week_Hybrid_Athlete_Program.md */

export type SessionKind = "strength" | "zone2" | "football" | "rest";

export interface StrengthExercise {
  id: string;
  name: string;
  cue: string;
  sets: number;
  repRange: string;
  tempo: string;
  rpeTarget: string;
  restSec: number;
  /** Circuit-style block (e.g. core) — log rounds instead of weight */
  isCircuit?: boolean;
  circuitItems?: string[];
  /** Zone 2 finisher attached to Lower A */
  isFinisher?: boolean;
  finisherMinutes?: number;
}

export interface Zone2Protocol {
  week: number;
  durationMin: number;
  paceGuide: string;
  incline: string;
  hrZone: string;
  rpe: string;
  notes: string;
}

export interface SprintProtocol {
  week: number;
  sprintSec: number | null;
  recoverySec: number | null;
  reps: number | null;
  sets: number | null;
  notes: string;
}

export interface FootballDrill {
  id: string;
  name: string;
  detail: string;
  reps: string;
}

export interface SessionDef {
  id: string;
  kind: SessionKind;
  name: string;
  shortLabel: string;
  focus: string;
  estMinutes: number;
  why?: string;
  exercises?: StrengthExercise[];
  /** Zone 2 main session (Wed) */
  zone2?: true;
  /** Football drills vary by phase */
  football?: true;
}

export const WEEK_TEMPLATE = [
  { d: "Mon", label: "Upper A", sessionId: "upper-a" },
  { d: "Tue", label: "Lower A", sessionId: "lower-a" },
  { d: "Wed", label: "Zone 2", sessionId: "zone2" },
  { d: "Thu", label: "Upper B", sessionId: "upper-b" },
  { d: "Fri", label: "Lower B", sessionId: "lower-b" },
  { d: "Sat", label: "Football", sessionId: "football" },
  { d: "Sun", label: "Rest", sessionId: "rest" },
] as const;

export const SESSIONS: Record<string, SessionDef> = {
  "upper-a": {
    id: "upper-a",
    kind: "strength",
    name: "Upper Body A",
    shortLabel: "Upper A",
    focus: "Push-dominant hypertrophy",
    estMinutes: 55,
    why: "Chest/shoulders/triceps share pushing mechanics — heaviest compound to isolation. Priority on upper chest and side/rear delts.",
    exercises: [
      {
        id: "incline-press",
        name: "Incline Barbell/Machine Press",
        cue: "Upper-chest priority — chosen ahead of flat press for lagging upper chest.",
        sets: 4, repRange: "6–8", tempo: "2-0-1-0", rpeTarget: "7–8", restSec: 120,
      },
      {
        id: "flat-db-press",
        name: "Flat DB Press",
        cue: "Overall chest mass and pressing strength.",
        sets: 3, repRange: "8–10", tempo: "2-0-1-1", rpeTarget: "7–8", restSec: 90,
      },
      {
        id: "seated-db-shoulder-press",
        name: "Seated DB Shoulder Press",
        cue: "Overhead pressing for delts and long-term shoulder health.",
        sets: 3, repRange: "8–10", tempo: "2-0-1-0", rpeTarget: "7", restSec: 90,
      },
      {
        id: "lateral-raise",
        name: "Cable/DB Lateral Raise",
        cue: "#1 priority delt exercise — side-delt width. Control beats load.",
        sets: 4, repRange: "12–15", tempo: "1-1-1-1", rpeTarget: "8", restSec: 60,
      },
      {
        id: "rear-delt-fly",
        name: "Rear Delt Cable Fly / Reverse Pec Deck",
        cue: "Rear delts respond better to control than heavy load.",
        sets: 3, repRange: "12–15", tempo: "2-0-1-1", rpeTarget: "7–8", restSec: 60,
      },
      {
        id: "triceps-pushdown",
        name: "Triceps Rope Pushdown",
        cue: "Triceps are ~2/3 of upper-arm mass.",
        sets: 3, repRange: "10–12", tempo: "2-0-1-0", rpeTarget: "7", restSec: 60,
      },
      {
        id: "weighted-dips",
        name: "Weighted Dips or Assisted Dip Machine",
        cue: "Compound finisher — chest, triceps, shoulder stability.",
        sets: 2, repRange: "8–10", tempo: "2-0-1-0", rpeTarget: "7", restSec: 90,
      },
    ],
  },

  "lower-a": {
    id: "lower-a",
    kind: "strength",
    name: "Lower Body A",
    shortLabel: "Lower A",
    focus: "Quad/strength dominant + Zone 2 finisher",
    estMinutes: 60,
    why: "Squat pattern underpins sprint acceleration and jump power — transfers to football.",
    exercises: [
      {
        id: "back-squat",
        name: "Back Squat (or Leg Press)",
        cue: "Strength foundation for sprint acceleration. Control the eccentric.",
        sets: 4, repRange: "5–8", tempo: "3-0-1-0", rpeTarget: "7–8", restSec: 150,
      },
      {
        id: "walking-lunges",
        name: "Walking Lunges",
        cue: "Unilateral strength + hip stability. Add DB weight before reps.",
        sets: 3, repRange: "10/leg", tempo: "2-0-1-0", rpeTarget: "7", restSec: 90,
      },
      {
        id: "leg-extension",
        name: "Leg Extension",
        cue: "Quad isolation — add reps then load.",
        sets: 3, repRange: "12–15", tempo: "2-0-1-1", rpeTarget: "8", restSec: 60,
      },
      {
        id: "standing-calf-raise",
        name: "Standing Calf Raise",
        cue: "Priority lagging area — pause at top. Add reps to 15 before load.",
        sets: 4, repRange: "12–15", tempo: "1-1-2-0", rpeTarget: "8", restSec: 60,
      },
      {
        id: "zone2-finisher",
        name: "Zone 2 Finisher",
        cue: "Treadmill walk/incline walk — conversational pace. Extend to 15 min by Phase 2.",
        sets: 1, repRange: "—", tempo: "—", rpeTarget: "4–5", restSec: 0,
        isFinisher: true, finisherMinutes: 10,
      },
    ],
  },

  "upper-b": {
    id: "upper-b",
    kind: "strength",
    name: "Upper Body B",
    shortLabel: "Upper B",
    focus: "Pull-dominant hypertrophy",
    estMinutes: 55,
    why: "Back width/thickness, traps, biceps/forearms — targets 6 of 10 hypertrophy priorities.",
    exercises: [
      {
        id: "lat-pulldown",
        name: "Lat Pulldown (wide grip)",
        cue: "Also a calisthenics feeder for pull-ups. Add load at 10 reps.",
        sets: 4, repRange: "8–10", tempo: "2-0-1-1", rpeTarget: "7–8", restSec: 90,
      },
      {
        id: "barbell-row",
        name: "Barbell or Cable Row",
        cue: "Back thickness — add load at 10 reps.",
        sets: 4, repRange: "8–10", tempo: "2-0-1-0", rpeTarget: "7–8", restSec: 90,
      },
      {
        id: "barbell-shrug",
        name: "Barbell Shrug",
        cue: "Priority trap development — pause at top before adding load.",
        sets: 3, repRange: "10–12", tempo: "1-1-2-0", rpeTarget: "8", restSec: 90,
      },
      {
        id: "face-pull",
        name: "Face Pull",
        cue: "Rear delt/upper back health + shoulder injury prevention.",
        sets: 3, repRange: "15", tempo: "1-0-1-1", rpeTarget: "7", restSec: 60,
      },
      {
        id: "db-bicep-curl",
        name: "DB Bicep Curl",
        cue: "Arm size — add load at 12 reps.",
        sets: 3, repRange: "10–12", tempo: "2-0-1-1", rpeTarget: "7", restSec: 60,
      },
      {
        id: "forearm-curl",
        name: "Reverse Curl / Wrist Curl",
        cue: "Priority lagging area — add reps first.",
        sets: 3, repRange: "12–15", tempo: "2-0-1-0", rpeTarget: "7", restSec: 45,
      },
    ],
  },

  "lower-b": {
    id: "lower-b",
    kind: "strength",
    name: "Lower Body B",
    shortLabel: "Lower B",
    focus: "Posterior chain + core",
    estMinutes: 55,
    why: "Hamstrings/glutes drive sprint speed and deceleration — injury prevention as much as aesthetics.",
    exercises: [
      {
        id: "rdl",
        name: "Romanian Deadlift",
        cue: "Control the eccentric — where hamstrings grow and get injury-resistant.",
        sets: 4, repRange: "6–8", tempo: "3-0-1-0", rpeTarget: "7–8", restSec: 120,
      },
      {
        id: "hip-thrust",
        name: "Hip Thrust",
        cue: "Glute drive for sprint power. Add load at 12 reps.",
        sets: 3, repRange: "10–12", tempo: "2-0-1-1", rpeTarget: "7–8", restSec: 90,
      },
      {
        id: "seated-leg-curl",
        name: "Seated Leg Curl",
        cue: "Hamstring isolation. Nordic curl negatives in Phase 3.",
        sets: 3, repRange: "12–15", tempo: "2-0-1-1", rpeTarget: "8", restSec: 60,
      },
      {
        id: "seated-calf-raise",
        name: "Seated Calf Raise",
        cue: "Soleus emphasis — complements standing raise.",
        sets: 3, repRange: "15", tempo: "1-1-2-0", rpeTarget: "8", restSec: 60,
      },
      {
        id: "core-circuit",
        name: "Core Circuit",
        cue: "Plank, Dead Bug, Pallof Press — add hold time before resistance.",
        sets: 3, repRange: "30–45s", tempo: "—", rpeTarget: "7", restSec: 30,
        isCircuit: true,
        circuitItems: ["Plank", "Dead Bug", "Pallof Press"],
      },
    ],
  },

  zone2: {
    id: "zone2",
    kind: "zone2",
    name: "Zone 2 + Mobility + Calisthenics",
    shortLabel: "Zone 2",
    focus: "Aerobic base + skill work",
    estMinutes: 50,
    why: "Zone 2 builds mitochondrial density — the fix for 'can't breathe between runs'. Mobility + calisthenics on the same day.",
    zone2: true,
  },

  football: {
    id: "football",
    kind: "football",
    name: "Football Conditioning",
    shortLabel: "Football",
    focus: "COD, shuttles, RSA",
    estMinutes: 45,
    why: "Direction-change and reactive agility — distinct from straight-line speed and aerobic capacity.",
    football: true,
  },

  rest: {
    id: "rest",
    kind: "rest",
    name: "Full Rest",
    shortLabel: "Rest",
    focus: "Optional easy walk + mobility",
    estMinutes: 0,
    why: "Recovery is training. Sleep, hydration, optional 20–30 min walk.",
  },
};

export const ZONE2_BY_WEEK: Zone2Protocol[] = [
  { week: 1, durationMin: 20, paceGuide: "Easy jog, walk if HR spikes", incline: "0–1%", hrZone: "118–138 bpm", rpe: "4–5", notes: "Walk breaks allowed — keep HR in range. Baseline 3km time trial before block starts." },
  { week: 2, durationMin: 22, paceGuide: "Easy jog", incline: "0–1%", hrZone: "118–138 bpm", rpe: "4–5", notes: "" },
  { week: 3, durationMin: 25, paceGuide: "Easy jog", incline: "1%", hrZone: "118–138 bpm", rpe: "4–5", notes: "" },
  { week: 4, durationMin: 28, paceGuide: "Easy jog", incline: "1%", hrZone: "118–138 bpm", rpe: "4–5", notes: "End of Phase 1 — reassess resting HR." },
  { week: 5, durationMin: 30, paceGuide: "Easy jog, slightly faster at same HR", incline: "1–2%", hrZone: "118–138 bpm", rpe: "5", notes: "Faster pace at same HR = real adaptation." },
  { week: 6, durationMin: 32, paceGuide: "Easy jog", incline: "1–2%", hrZone: "118–138 bpm", rpe: "5", notes: "" },
  { week: 7, durationMin: 35, paceGuide: "Easy jog", incline: "1–2%", hrZone: "118–138 bpm", rpe: "5", notes: "" },
  { week: 8, durationMin: 40, paceGuide: "35 min Z2 + 5 min tempo", incline: "1–2%", hrZone: "118–138, tempo 138–155", rpe: "5 then 6–7", notes: "First controlled intensity add." },
  { week: 9, durationMin: 38, paceGuide: "30 min Z2 + 8 min tempo", incline: "1–2%", hrZone: "as above", rpe: "5–7", notes: "" },
  { week: 10, durationMin: 40, paceGuide: "30 min Z2 + 10 min tempo", incline: "1–2%", hrZone: "as above", rpe: "5–7", notes: "" },
  { week: 11, durationMin: 35, paceGuide: "Easy jog — deload", incline: "1%", hrZone: "118–138 bpm", rpe: "4–5", notes: "Deload week before final test." },
  { week: 12, durationMin: 0, paceGuide: "3km time trial", incline: "0–1%", hrZone: "up to 90% max", rpe: "8–9", notes: "Test day — compare to Week 1 baseline." },
];

export const SPRINT_BY_WEEK: SprintProtocol[] = [
  { week: 1, sprintSec: null, recoverySec: null, reps: null, sets: null, notes: "Not yet — build Zone 2 base first." },
  { week: 2, sprintSec: null, recoverySec: null, reps: null, sets: null, notes: "Not yet — build Zone 2 base first." },
  { week: 3, sprintSec: 10, recoverySec: 50, reps: 4, sets: 1, notes: "Mechanics focus, full recovery (~1:5)." },
  { week: 4, sprintSec: 10, recoverySec: 50, reps: 5, sets: 1, notes: "" },
  { week: 5, sprintSec: 12, recoverySec: 60, reps: 5, sets: 1, notes: "" },
  { week: 6, sprintSec: 12, recoverySec: 60, reps: 6, sets: 1, notes: "" },
  { week: 7, sprintSec: 15, recoverySec: 75, reps: 6, sets: 2, notes: "True RSA demand — 3 min between sets." },
  { week: 8, sprintSec: 15, recoverySec: 60, reps: 6, sets: 2, notes: "Recovery shortened — RSA improves here." },
  { week: 9, sprintSec: 15, recoverySec: 45, reps: 6, sets: 2, notes: "Shorter session, same quality." },
  { week: 10, sprintSec: 15, recoverySec: 45, reps: 8, sets: 2, notes: "" },
  { week: 11, sprintSec: 18, recoverySec: 50, reps: 8, sets: 2, notes: "15–20s sprints, 45–60s recovery." },
  { week: 12, sprintSec: 15, recoverySec: 30, reps: 10, sets: 1, notes: "Test: track times each rep. Fatigue index = rep10 ÷ rep1." },
];

export function footballDrillsForWeek(week: number): FootballDrill[] {
  if (week <= 4) {
    return [
      { id: "ladder-accel", name: "Ladder/Cone Acceleration", detail: "5m, 10m — first-step quickness", reps: "6 reps, full recovery" },
      { id: "shuttle-5105", name: "5-10-5 Shuttle", detail: "Learn deceleration/redirection — submaximal", reps: "4 reps, 90s rest, RPE 6" },
      { id: "decel", name: "Deceleration Drills", detail: "Sprint 10m, controlled stop within 2 steps", reps: "6 reps" },
    ];
  }
  if (week <= 8) {
    return [
      { id: "shuttle-5105", name: "5-10-5 Shuttle", detail: "Intensity up", reps: "6 reps, RPE 8, 90s rest" },
      { id: "sprint-cut", name: "20m Sprint + 180° Cut", detail: "Cut at 10m", reps: "6 reps, full recovery" },
      { id: "box-drill", name: "Box Drill (4-cone)", detail: "Reactive agility", reps: "4 reps" },
      { id: "curved-sprints", name: "Curved Treadmill Sprints", detail: "See sprint protocol for this week", reps: "per protocol" },
    ];
  }
  return [
    { id: "repeated-shuttle", name: "Repeated Shuttle Sets", detail: "3 sets of 4× 5-10-5 — match-play demand", reps: "60s between reps, 3 min between sets" },
    { id: "sprint-decel-back", name: "30m Sprint-Decel-Backpedal", detail: "Combo pattern", reps: "6 reps" },
    { id: "ssg", name: "Small-Sided Game / Scrimmage", detail: "Best transfer test if available", reps: "as available" },
    { id: "curved-sprints", name: "Curved Treadmill Sprints", detail: "See sprint protocol for this week", reps: "per protocol" },
  ];
}

/** Calisthenics skill block shown on Wed alongside Zone 2 */
export const CALISTHENICS_SKILLS = [
  { id: "pushup-prog", name: "Push-up Progression", detail: "Incline → knee → full. Move up only at clean rep targets." },
  { id: "pullup-prog", name: "Pull-up Progression", detail: "Dead hang → scapular → assisted → negatives (Phase 2)." },
  { id: "lsit-prog", name: "L-sit Progression", detail: "Tuck hold → single-leg → full L-sit (Phase 3 only)." },
  { id: "dip-prog", name: "Dip Progression", detail: "Bench dip → assisted machine. Full dips = future block." },
];

export const MOBILITY_ITEMS = [
  { id: "ankle", name: "Wall Ankle Dorsiflexion", detail: "10 reps/side, 2s hold" },
  { id: "hip-9090", name: "90/90 Hip Stretch", detail: "30–45s/side" },
  { id: "wgs", name: "World's Greatest Stretch", detail: "5 reps/side" },
  { id: "open-book", name: "Open-Book Rotation", detail: "8 reps/side" },
  { id: "wall-slides", name: "Wall Slides", detail: "10 reps" },
  { id: "hamstring", name: "Hamstring Stretch", detail: "30s/side × 2" },
  { id: "wrist", name: "Wrist Flexor/Extensor", detail: "20–30s each direction" },
];

export function getSessionForDay(mondayIdx: number): SessionDef {
  const id = WEEK_TEMPLATE[mondayIdx].sessionId;
  return SESSIONS[id];
}

export function getZone2(week: number): Zone2Protocol {
  return ZONE2_BY_WEEK[Math.min(11, Math.max(0, week - 1))];
}

export function getSprint(week: number): SprintProtocol {
  return SPRINT_BY_WEEK[Math.min(11, Math.max(0, week - 1))];
}

export function finisherMinutesForWeek(week: number): number {
  return week >= 5 ? 15 : 10;
}

/** Flat map of strength exercise id → display name */
export function exerciseNameMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of Object.values(SESSIONS)) {
    for (const ex of s.exercises ?? []) {
      map[ex.id] = ex.name;
    }
  }
  return map;
}

/** Primary compound lifts for Progress strength charts */
export const TRACKED_LIFTS = [
  "incline-press",
  "flat-db-press",
  "lat-pulldown",
  "barbell-row",
  "back-squat",
  "rdl",
  "hip-thrust",
  "seated-db-shoulder-press",
] as const;

export const PHASES = [
  {
    id: 1 as const,
    name: "Foundation",
    weeks: [1, 2, 3, 4] as const,
    focus: "Aerobic base, movement patterns, calisthenics/mobility habits. Cardio is the main adaptation.",
  },
  {
    id: 2 as const,
    name: "Build",
    weeks: [5, 6, 7, 8] as const,
    focus: "Lifting loads up, curved-treadmill sprints in, harder calisthenics variations.",
  },
  {
    id: 3 as const,
    name: "Intensify & Test",
    weeks: [9, 10, 11, 12] as const,
    focus: "Highest density, football conditioning peaks, Week 12 retest of all benchmarks.",
  },
] as const;

/** Recomp nutrition from program doc — cycles by training vs rest day */
export const NUTRITION = {
  strategy: "Body recomposition",
  kcalTrain: { min: 2500, max: 2650 },
  kcalRest: { min: 2500, max: 2550 },
  proteinG: { min: 150, max: 160 },
  carbsTrainG: { min: 300, max: 330 },
  carbsRestG: { min: 230, max: 250 },
  fatG: { min: 70, max: 85 },
  notes:
    "Protein non-negotiable. Higher carbs on train days. Pre/post protein+carb within ~2h of hard sessions.",
} as const;

export function nutritionForDay(isRestDay: boolean) {
  return {
    kcal: isRestDay ? NUTRITION.kcalRest : NUTRITION.kcalTrain,
    proteinG: NUTRITION.proteinG,
    carbsG: isRestDay ? NUTRITION.carbsRestG : NUTRITION.carbsTrainG,
    fatG: NUTRITION.fatG,
    label: isRestDay ? "Rest day" : "Training day",
  };
}

/** Default goal seeds from program checkpoints — editable after */
export function defaultWeeklyGoals(week: number): string[] {
  const z2 = getZone2(week);
  const sprint = getSprint(week);
  const goals = [
    `Complete all 6 training sessions (rest Sunday counts)`,
    `Zone 2: ${z2.durationMin > 0 ? `${z2.durationMin} min — ${z2.paceGuide}` : z2.paceGuide}`,
    `Hit double-progression rule on key lifts (add load only when top of range ×2)`,
  ];
  if (sprint.sprintSec) {
    goals.push(
      `Sprints: ${sprint.reps}×${sprint.sprintSec}s × ${sprint.sets} set(s), ${sprint.recoverySec}s recovery`,
    );
  } else {
    goals.push(`No sprints yet — protect Zone 2 base (${sprint.notes})`);
  }
  if (week === 1) goals.push("Record baseline 3km / 20-min time trial");
  if (week === 12) goals.push("Week 12 retest: 3km TT, RSA set, Tanita, photos, top-set loads");
  if (week === 11) goals.push("Deload feel — quality over volume");
  return goals;
}

export function defaultMonthlyGoals(monthKey: string, week: number): string[] {
  void monthKey;
  const phase = week <= 4 ? 1 : week <= 8 ? 2 : 3;
  if (phase === 1) {
    return [
      "Establish Zone 2 habit without chasing pace",
      "Tanita scan + progress photos mid-phase",
      "Unassisted pull-up path: dead hang → scap pulls consistent",
    ];
  }
  if (phase === 2) {
    return [
      "Introduce RSA / curved sprints with full recovery quality",
      "Progress calisthenics: negatives / single-leg tuck L-sit work",
      "Gassing onset later in football / scrimmage",
    ];
  }
  return [
    "Peak football conditioning without junk volume",
    "Week 12 full retest battery vs Week 1",
    "Decide next 12-week block adjustments from data, not vibes",
  ];
}
