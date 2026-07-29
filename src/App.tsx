import { useState, useEffect, useRef, useCallback } from "react";
import { TodayScreen } from "./components/TodayScreen";
import { StrengthWorkout } from "./components/StrengthWorkout";
import { Zone2Workout } from "./components/Zone2Workout";
import { FootballWorkout } from "./components/FootballWorkout";
import { SummaryScreen } from "./components/SummaryScreen";
import { ProgressScreen } from "./components/ProgressScreen";
import { PlanScreen } from "./components/PlanScreen";
import { YouScreen } from "./components/YouScreen";
import { TrainScreen } from "./components/TrainScreen";
import { BottomNav, type NavKey } from "./components/BottomNav";
import { C } from "./lib/tokens";
import {
  todayKey,
  mondayIndexOf,
  programWeek,
  phaseForWeek,
  weekStartKey,
} from "./lib/dates";
import { getSessionForDay, WEEK_TEMPLATE, type SessionDef } from "./data/program";
import {
  ensureSettings,
  getDaily,
  saveDaily,
  getHistory,
  getWeekStatus,
  markDayDone,
  saveSession,
  getLastSessionVolume,
  db,
  type DailyLog,
  type ExerciseHistory,
  type SetLog,
  type SessionLog,
} from "./db";
import { getEffectiveSession, getEffectiveSessionForDay } from "./db/overrides";
import {
  clearDraft,
  clearOldDrafts,
  draftId,
  getDraft,
  getTodaysDraft,
  saveDraft,
  type ActiveWorkoutDraft,
} from "./db/activeWorkout";
import { computeReadiness } from "./lib/readiness";

type View = "tab" | "workout" | "summary";

export default function App() {
  const [tab, setTab] = useState<NavKey>("today");
  const [view, setView] = useState<View>("tab");
  const [ready, setReady] = useState(false);
  const [programStartDate, setProgramStartDate] = useState("");
  const [daily, setDaily] = useState<DailyLog>({
    date: todayKey(),
    water: 0,
    sleep: null,
    weight: null,
    readiness: null,
    restingHr: null,
  });
  const [history, setHistory] = useState<Record<string, ExerciseHistory>>({});
  const [weekStatus, setWeekStatus] = useState<Record<number, "done" | "partial">>({});
  const [recentHr, setRecentHr] = useState<{ date: string; restingHr: number | null }[]>([]);
  const [session, setSession] = useState<SessionDef>(() => getSessionForDay(mondayIndexOf()));
  const [elapsedSec, setElapsedSec] = useState(0);
  const [sessionLog, setSessionLog] = useState({
    sets: 0,
    volume: 0,
    prs: 0,
    prevVolume: 0,
  });
  const sessionLogRef = useRef(sessionLog);
  sessionLogRef.current = sessionLog;
  const [summaryExtras, setSummaryExtras] = useState<{ sessionName: string }>({ sessionName: "" });
  const [draft, setDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [hasInProgress, setHasInProgress] = useState(false);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const draftRef = useRef<ActiveWorkoutDraft | null>(null);
  draftRef.current = draft;

  const week = programStartDate ? programWeek(programStartDate) : 1;
  const phase = phaseForWeek(week);
  const dayIdx = mondayIndexOf();

  const loadAll = useCallback(async () => {
    const settings = await ensureSettings();
    setProgramStartDate(settings.programStartDate);

    const d = await getDaily(todayKey());
    setDaily(d);

    const wStatus = await getWeekStatus(weekStartKey());
    setWeekStatus(wStatus);

    const recent: { date: string; restingHr: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = todayKey(dt);
      const row = await db.dailyLogs.get(key);
      recent.push({ date: key, restingHr: row?.restingHr ?? (key === todayKey() ? d.restingHr : null) });
    }
    setRecentHr(recent);

    const eff = await getEffectiveSessionForDay(mondayIndexOf());
    setSession(eff);

    const hist: Record<string, ExerciseHistory> = {};
    if (eff.exercises) {
      for (const ex of eff.exercises) {
        const h = await getHistory(ex.id);
        if (h) hist[ex.id] = h;
      }
    }
    setHistory(hist);

    await clearOldDrafts(todayKey());
    const todays = await getTodaysDraft(todayKey());
    setHasInProgress(Boolean(todays && todays.sessionId === eff.id));

    setReady(true);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const beginTicker = (startedAt: number) => {
    startedAtRef.current = startedAt;
    setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    clearTick();
    tickRef.current = window.setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    }, 1000);
  };

  const writeDraft = async (next: ActiveWorkoutDraft) => {
    setDraft(next);
    draftRef.current = next;
    await saveDraft(next);
    setHasInProgress(true);
  };

  const reloadSession = async (sessionId?: string) => {
    const eff = sessionId
      ? await getEffectiveSession(sessionId)
      : await getEffectiveSessionForDay(mondayIndexOf());
    setSession(eff);
    const hist: Record<string, ExerciseHistory> = {};
    if (eff.exercises) {
      for (const ex of eff.exercises) {
        const h = await getHistory(ex.id);
        if (h) hist[ex.id] = h;
      }
    }
    setHistory(hist);
    const d = await getDraft(eff.id);
    setHasInProgress(Boolean(d));
  };

  const setDailyField = async <K extends keyof DailyLog>(field: K, value: DailyLog[K]) => {
    const next = { ...daily, date: todayKey(), [field]: value };
    setDaily(next);
    await saveDaily(next);
    if (field === "restingHr") {
      setRecentHr((prev) =>
        prev.map((r) => (r.date === todayKey() ? { ...r, restingHr: value as number | null } : r)),
      );
    }
  };

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startSession = async (sessionId?: string) => {
    const eff = sessionId
      ? await getEffectiveSession(sessionId)
      : await getEffectiveSessionForDay(mondayIndexOf());
    setSession(eff);
    const hist: Record<string, ExerciseHistory> = {};
    if (eff.exercises) {
      for (const ex of eff.exercises) {
        const h = await getHistory(ex.id);
        if (h) hist[ex.id] = h;
      }
    }
    setHistory(hist);

    const existing = await getDraft(eff.id);
    const prevVol = existing?.sessionLog.prevVolume ?? (await getLastSessionVolume(eff.id));

    if (existing) {
      setSessionLog(existing.sessionLog);
      setDraft(existing);
      beginTicker(existing.startedAt);
    } else {
      const startedAt = Date.now();
      const fresh: ActiveWorkoutDraft = {
        id: draftId(todayKey(), eff.id),
        date: todayKey(),
        sessionId: eff.id,
        week,
        startedAt,
        exerciseIdx: 0,
        rows: {},
        extras: {},
        sessionLog: { sets: 0, volume: 0, prs: 0, prevVolume: prevVol },
        updatedAt: new Date().toISOString(),
      };
      setSessionLog(fresh.sessionLog);
      await writeDraft(fresh);
      beginTicker(startedAt);
    }
    setView("workout");
  };

  const onLogSet = ({ volume, isPR }: { volume: number; isPR: boolean }) => {
    setSessionLog((s) => {
      const next = {
        sets: s.sets + 1,
        volume: s.volume + volume,
        prs: s.prs + (isPR ? 1 : 0),
        prevVolume: s.prevVolume,
      };
      const d = draftRef.current;
      if (d) {
        const updated = { ...d, sessionLog: next };
        void writeDraft(updated);
      }
      return next;
    });
  };

  const persistComplete = async (
    exercises: { exerciseId: string; sets: SetLog[] }[],
    extras?: SessionLog["extras"],
  ) => {
    clearTick();
    const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const stats = sessionLogRef.current;
    const log: SessionLog = {
      date: todayKey(),
      sessionId: session.id,
      week,
      startedAt: startedAtRef.current,
      finishedAt: Date.now(),
      durationSec: duration,
      exercises,
      extras,
      totalVolume: stats.volume,
      setsLogged: stats.sets,
      prsHit: stats.prs,
      completed: true,
    };
    await saveSession(log);
    await clearDraft(session.id);
    setDraft(null);
    setHasInProgress(false);
    await markDayDone(weekStartKey(), dayIdx, "done");
    setWeekStatus((prev) => ({ ...prev, [dayIdx]: "done" }));
    setSummaryExtras({ sessionName: session.name });
    setElapsedSec(duration);
    setView("summary");
  };

  const finishStrength = (exerciseLogs: { exerciseId: string; sets: SetLog[] }[]) => {
    void persistComplete(exerciseLogs);
  };

  const finishZone2 = (extras: NonNullable<SessionLog["extras"]>) => {
    void persistComplete([], extras);
  };

  const finishFootball = (extras: NonNullable<SessionLog["extras"]>) => {
    void persistComplete([], extras);
  };

  const exitWorkout = () => {
    // Draft already saved by child on unmount / changes
    const d = draftRef.current;
    if (d) {
      void writeDraft({ ...d, sessionLog: sessionLogRef.current });
    }
    clearTick();
    setHasInProgress(true);
    setView("tab");
    setTab("today");
  };

  const discardInProgress = async () => {
    if (!window.confirm("Discard in-progress workout? Logged sets in this draft will be lost.")) return;
    await clearDraft(session.id);
    setDraft(null);
    setHasInProgress(false);
  };

  const volumeDelta =
    sessionLog.prevVolume > 0
      ? Math.round(((sessionLog.volume - sessionLog.prevVolume) / sessionLog.prevVolume) * 100)
      : 0;

  const readiness = computeReadiness(daily, recentHr);
  const readinessScore = readiness.score;

  if (!ready) {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.textMuted,
          fontFamily: "Inter, sans-serif",
        }}
      >
        Loading…
      </div>
    );
  }

  const hideNav = view === "workout";

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, position: "relative", paddingBottom: hideNav ? 24 : 74 }}>
        {view === "tab" && tab === "today" && (
          <TodayScreen
            daily={daily}
            setDailyField={setDailyField}
            onStart={() => void startSession()}
            onDiscardInProgress={hasInProgress ? () => void discardInProgress() : undefined}
            hasInProgress={hasInProgress}
            weekStatus={weekStatus}
            session={session}
            week={week}
            phase={phase}
            readiness={readiness}
          />
        )}

        {view === "tab" && tab === "progress" && <ProgressScreen />}

        {view === "tab" && tab === "plan" && (
          <PlanScreen week={week} phase={phase} programStartDate={programStartDate} />
        )}

        {view === "tab" && tab === "you" && (
          <YouScreen
            week={week}
            phase={phase}
            programStartDate={programStartDate}
            daily={daily}
          />
        )}

        {view === "tab" && tab === "train" && (
          <TrainScreen
            week={week}
            onStartSession={(id) => {
              void startSession(id);
            }}
          />
        )}

        {view === "workout" && session.kind === "strength" && (
          <StrengthWorkout
            key={draft?.id ?? session.id}
            session={session}
            week={week}
            history={history}
            onHistoryUpdate={(id, h) => setHistory((prev) => ({ ...prev, [id]: h }))}
            onLogSet={onLogSet}
            onExit={exitWorkout}
            onFinish={finishStrength}
            elapsedSec={elapsedSec}
            initialRows={draft?.sessionId === session.id ? draft.rows : undefined}
            initialExerciseIdx={draft?.sessionId === session.id ? draft.exerciseIdx : 0}
            onDraftChange={({ exerciseIdx, rows }) => {
              const base = draftRef.current;
              if (!base) return;
              void writeDraft({
                ...base,
                exerciseIdx,
                rows,
                sessionLog: sessionLogRef.current,
              });
            }}
          />
        )}

        {view === "workout" && session.kind === "zone2" && (
          <Zone2Workout
            key={draft?.id ?? session.id}
            session={session}
            week={week}
            onExit={exitWorkout}
            onFinish={finishZone2}
            elapsedSec={elapsedSec}
            initialExtras={draft?.sessionId === session.id ? draft.extras : undefined}
            onDraftChange={(extras) => {
              const base = draftRef.current;
              if (!base) return;
              void writeDraft({ ...base, extras, sessionLog: sessionLogRef.current });
            }}
          />
        )}

        {view === "workout" && session.kind === "football" && (
          <FootballWorkout
            key={draft?.id ?? session.id}
            session={session}
            week={week}
            onExit={exitWorkout}
            onFinish={finishFootball}
            elapsedSec={elapsedSec}
            initialExtras={draft?.sessionId === session.id ? draft.extras : undefined}
            onDraftChange={(extras) => {
              const base = draftRef.current;
              if (!base) return;
              void writeDraft({ ...base, extras, sessionLog: sessionLogRef.current });
            }}
          />
        )}

        {view === "summary" && (
          <SummaryScreen
            stats={{
              duration: elapsedSec,
              volume: sessionLog.volume,
              sets: sessionLog.sets,
              prs: sessionLog.prs,
              volumeDelta,
              sessionName: summaryExtras.sessionName,
              readinessScore,
            }}
            onDone={() => {
              setView("tab");
              setTab("today");
            }}
          />
        )}

        <BottomNav
          active={view === "workout" ? "train" : tab}
          onChange={(k) => {
            if (view === "workout") return;
            setView("tab");
            setTab(k);
            if (k === "today") void reloadSession(WEEK_TEMPLATE[mondayIndexOf()].sessionId);
          }}
          hidden={hideNav}
        />
      </div>
    </div>
  );
}
