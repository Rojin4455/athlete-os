import { useState, useEffect, useRef, useCallback } from "react";
import { TodayScreen } from "./components/TodayScreen";
import { StrengthWorkout } from "./components/StrengthWorkout";
import { Zone2Workout } from "./components/Zone2Workout";
import { FootballWorkout } from "./components/FootballWorkout";
import { SummaryScreen } from "./components/SummaryScreen";
import { BottomNav, type NavKey } from "./components/BottomNav";
import { PlaceholderTab } from "./components/PlaceholderTab";
import { C } from "./lib/tokens";
import {
  todayKey,
  mondayIndexOf,
  programWeek,
  phaseForWeek,
  weekStartKey,
} from "./lib/dates";
import { getSessionForDay } from "./data/program";
import {
  ensureSettings,
  getDaily,
  saveDaily,
  getHistory,
  getWeekStatus,
  markDayDone,
  saveSession,
  getLastSessionVolume,
  type DailyLog,
  type ExerciseHistory,
  type SetLog,
  type SessionLog,
} from "./db";

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
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const week = programStartDate ? programWeek(programStartDate) : 1;
  const phase = phaseForWeek(week);
  const dayIdx = mondayIndexOf();
  const session = getSessionForDay(dayIdx);

  const loadAll = useCallback(async () => {
    const settings = await ensureSettings();
    setProgramStartDate(settings.programStartDate);

    const d = await getDaily(todayKey());
    setDaily(d);

    const wStatus = await getWeekStatus(weekStartKey());
    setWeekStatus(wStatus);

    // Prefetch history for today's strength exercises
    const hist: Record<string, ExerciseHistory> = {};
    if (session.exercises) {
      for (const ex of session.exercises) {
        const h = await getHistory(ex.id);
        if (h) hist[ex.id] = h;
      }
    }
    setHistory(hist);
    setReady(true);
  }, [session.exercises]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const setDailyField = async <K extends keyof DailyLog>(field: K, value: DailyLog[K]) => {
    const next = { ...daily, date: todayKey(), [field]: value };
    setDaily(next);
    await saveDaily(next);
  };

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startSession = async () => {
    const prevVol = await getLastSessionVolume(session.id);
    setSessionLog({ sets: 0, volume: 0, prs: 0, prevVolume: prevVol });
    startedAtRef.current = Date.now();
    setElapsedSec(0);
    clearTick();
    tickRef.current = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    setView("workout");
  };

  const onLogSet = ({ volume, isPR }: { volume: number; isPR: boolean }) => {
    setSessionLog((s) => ({
      sets: s.sets + 1,
      volume: s.volume + volume,
      prs: s.prs + (isPR ? 1 : 0),
      prevVolume: s.prevVolume,
    }));
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
    clearTick();
    setView("tab");
    setTab("today");
  };

  const volumeDelta =
    sessionLog.prevVolume > 0
      ? Math.round(((sessionLog.volume - sessionLog.prevVolume) / sessionLog.prevVolume) * 100)
      : 0;

  const readinessScore = (() => {
    const map = { ready: 88, okay: 64, tired: 38 } as const;
    const base = daily.readiness ? map[daily.readiness] : 70;
    const sleepAdj = daily.sleep != null ? Math.min(10, Math.max(-10, (daily.sleep - 7.5) * 6)) : 0;
    return Math.round(Math.min(98, Math.max(20, base + sleepAdj)));
  })();

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
            onStart={startSession}
            weekStatus={weekStatus}
            session={session}
            week={week}
            phase={phase}
          />
        )}

        {view === "tab" && tab !== "today" && (
          <PlaceholderTab
            tab={tab}
            week={week}
            phase={phase}
            programStartDate={programStartDate}
          />
        )}

        {view === "workout" && session.kind === "strength" && (
          <StrengthWorkout
            session={session}
            week={week}
            history={history}
            onHistoryUpdate={(id, h) => setHistory((prev) => ({ ...prev, [id]: h }))}
            onLogSet={onLogSet}
            onExit={exitWorkout}
            onFinish={finishStrength}
            elapsedSec={elapsedSec}
          />
        )}

        {view === "workout" && session.kind === "zone2" && (
          <Zone2Workout
            session={session}
            week={week}
            onExit={exitWorkout}
            onFinish={finishZone2}
            elapsedSec={elapsedSec}
          />
        )}

        {view === "workout" && session.kind === "football" && (
          <FootballWorkout
            session={session}
            week={week}
            onExit={exitWorkout}
            onFinish={finishFootball}
            elapsedSec={elapsedSec}
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
          }}
          hidden={hideNav}
        />
      </div>
    </div>
  );
}
