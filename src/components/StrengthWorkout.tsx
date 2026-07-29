import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, Award, Copy } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import { fmtClock, todayKey } from "../lib/dates";
import {
  type SessionDef,
  type StrengthExercise,
  finisherMinutesForWeek,
} from "../data/program";
import type { ExerciseHistory, SetLog } from "../db";
import { upsertHistory } from "../db";

interface Props {
  session: SessionDef;
  week: number;
  history: Record<string, ExerciseHistory>;
  onHistoryUpdate: (exerciseId: string, h: ExerciseHistory) => void;
  onLogSet: (payload: { volume: number; isPR: boolean }) => void;
  onExit: () => void;
  onFinish: (exerciseLogs: { exerciseId: string; sets: SetLog[] }[]) => void;
  elapsedSec: number;
}

const iconBtnStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: C.surface2,
  border: `1px solid ${C.borderSoft}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const navBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "13px 0",
  borderRadius: 13,
  background: C.surface2,
  border: `1px solid ${C.borderSoft}`,
  color: C.text,
  fontFamily: FONTS.body,
  fontSize: 14,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  cursor: "pointer",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: FONTS.body, fontSize: 10.5, color: C.textFaint, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 13.5, color: C.text }}>{value}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, textAlign: "center" }}>
      {children}
    </span>
  );
}

function SetInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        textAlign: "center",
        background: disabled ? "transparent" : C.surface2,
        border: `1px solid ${disabled ? "transparent" : C.borderSoft}`,
        borderRadius: 9,
        padding: "8px 0",
        color: disabled ? C.textFaint : C.text,
        fontFamily: FONTS.mono,
        fontSize: 14,
        outline: "none",
      }}
    />
  );
}

function emptyRows(ex: StrengthExercise, week: number): SetLog[] {
  if (ex.isFinisher) {
    return [
      {
        weight: null,
        reps: null,
        rpe: null,
        done: false,
        minutes: finisherMinutesForWeek(week),
      },
    ];
  }
  return Array.from({ length: ex.sets }, () => ({
    weight: null,
    reps: null,
    rpe: null,
    done: false,
  }));
}

export function StrengthWorkout({
  session,
  week,
  history,
  onHistoryUpdate,
  onLogSet,
  onExit,
  onFinish,
  elapsedSec,
}: Props) {
  const exercises = session.exercises ?? [];
  const [idx, setIdx] = useState(0);
  const [rows, setRows] = useState<Record<string, SetLog[]>>({});
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [toast, setToast] = useState<{ text: string; pr: boolean } | null>(null);
  const timerRef = useRef<number | null>(null);

  const ex = exercises[idx];

  useEffect(() => {
    setRows((prev) => {
      if (prev[ex.id]) return prev;
      return { ...prev, [ex.id]: emptyRows(ex, week) };
    });
  }, [ex.id, ex, week]);

  useEffect(() => {
    if (!resting) return;
    timerRef.current = window.setInterval(() => {
      setRestLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setResting(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resting]);

  const hist = history[ex.id];
  const currentRows = rows[ex.id] || [];

  const setRow = (setIdx: number, field: keyof SetLog, val: string | number | boolean | null) => {
    setRows((prev) => {
      const arr = [...(prev[ex.id] || [])];
      arr[setIdx] = { ...arr[setIdx], [field]: val };
      return { ...prev, [ex.id]: arr };
    });
  };

  const setRowStr = (setIdx: number, field: "weight" | "reps" | "rpe" | "minutes", val: string) => {
    const num = val === "" ? null : parseFloat(val);
    setRow(setIdx, field, num);
  };

  const repeatLast = (setIdx: number) => {
    const prev = currentRows[setIdx - 1];
    const fallback = hist?.last;
    if (prev?.done && prev.weight != null) {
      setRows((p) => {
        const arr = [...(p[ex.id] || [])];
        arr[setIdx] = {
          ...arr[setIdx],
          weight: prev.weight,
          reps: prev.reps,
          rpe: prev.rpe,
        };
        return { ...p, [ex.id]: arr };
      });
    } else if (fallback) {
      setRows((p) => {
        const arr = [...(p[ex.id] || [])];
        arr[setIdx] = {
          ...arr[setIdx],
          weight: fallback.weight,
          reps: fallback.reps,
          rpe: fallback.rpe,
        };
        return { ...p, [ex.id]: arr };
      });
    }
  };

  const logSet = async (setIdx: number) => {
    const row = currentRows[setIdx];
    if (ex.isFinisher) {
      if (row.minutes == null) return;
      setRow(setIdx, "done", true);
      onLogSet({ volume: 0, isPR: false });
      return;
    }
    if (ex.isCircuit) {
      setRow(setIdx, "done", true);
      onLogSet({ volume: 0, isPR: false });
      if (setIdx < ex.sets - 1 || idx < exercises.length - 1) {
        setRestLeft(ex.restSec || 30);
        setResting(true);
      }
      return;
    }
    if (row.weight == null || row.reps == null) return;
    const w = row.weight;
    const r = row.reps;
    const rpe = row.rpe;

    setRow(setIdx, "done", true);

    const { isPR, history: updated } = await upsertHistory(
      ex.id,
      { weight: w, reps: r, rpe },
      todayKey(),
    );
    onHistoryUpdate(ex.id, updated);
    onLogSet({ volume: w * r, isPR });

    if (isPR) {
      setToast({ text: `New PR — ${w}kg`, pr: true });
      setTimeout(() => setToast(null), 2200);
    }

    if (setIdx < ex.sets - 1 || idx < exercises.length - 1) {
      if (ex.restSec > 0) {
        setRestLeft(ex.restSec);
        setResting(true);
      }
    }
  };

  const isLast = idx === exercises.length - 1;

  const finish = () => {
    const logs = exercises.map((e) => ({
      exerciseId: e.id,
      sets: rows[e.id] || emptyRows(e, week),
    }));
    onFinish(logs);
  };

  return (
    <div style={{ padding: "20px 20px 28px", animation: "fadeUp .3s ease", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button type="button" onClick={onExit} style={iconBtnStyle}>
          <ChevronLeft size={18} color={C.textMuted} />
        </button>
        <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.textMuted }}>
          {fmtClock(elapsedSec)}
        </div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint }}>
          {idx + 1}/{exercises.length}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 22 }}>
        {exercises.map((e, i) => (
          <div
            key={e.id}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < idx ? C.positive : i === idx ? C.accent : C.borderSoft,
              transition: "background .3s",
            }}
          />
        ))}
      </div>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.borderSoft}`,
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 21,
            fontWeight: 600,
            color: C.text,
            marginBottom: 6,
          }}
        >
          {ex.name}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 12.5,
            color: C.textMuted,
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          {ex.cue}
        </div>

        {ex.isCircuit && (
          <div
            style={{
              background: C.surface2,
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 14,
              fontFamily: FONTS.body,
              fontSize: 12,
              color: C.textMuted,
            }}
          >
            {(ex.circuitItems ?? []).join(" · ")} — 30–45s each, 30s between
          </div>
        )}

        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {ex.isFinisher ? (
            <>
              <Stat label="Target" value={`${finisherMinutesForWeek(week)} min`} />
              <Stat label="RPE" value={ex.rpeTarget} />
            </>
          ) : (
            <>
              <Stat label="Target" value={`${ex.sets} × ${ex.repRange}`} />
              <Stat label="Tempo" value={ex.tempo} />
              <Stat label="RPE" value={ex.rpeTarget} />
              <Stat label="Rest" value={`${ex.restSec}s`} />
            </>
          )}
        </div>

        {!ex.isFinisher && !ex.isCircuit && hist?.last && (
          <div
            style={{
              background: C.surface2,
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted }}>Last time</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.text }}>
              {hist.last.weight}kg × {hist.last.reps}{" "}
              <span style={{ color: C.textFaint }}>
                {hist.last.rpe != null ? `@RPE${hist.last.rpe}` : ""}
              </span>
            </span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ex.isFinisher ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 40px", gap: 8 }}>
                <span />
                <Label>min</Label>
                <span />
              </div>
              {currentRows.map((row, si) => (
                <div
                  key={si}
                  style={{ display: "grid", gridTemplateColumns: "22px 1fr 40px", gap: 8, alignItems: "center" }}
                >
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textFaint }}>1</span>
                  <SetInput
                    value={row.minutes != null ? String(row.minutes) : ""}
                    onChange={(v) => setRowStr(si, "minutes", v)}
                    disabled={row.done}
                  />
                  <button
                    type="button"
                    onClick={() => logSet(si)}
                    disabled={row.done}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "none",
                      cursor: row.done ? "default" : "pointer",
                      background: row.done ? C.positiveSoft : C.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={16} color={row.done ? C.positive : "#1A1006"} />
                  </button>
                </div>
              ))}
            </>
          ) : ex.isCircuit ? (
            currentRows.map((row, si) => (
              <div
                key={si}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: C.surface2,
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.text }}>
                  Round {si + 1}
                </span>
                <button
                  type="button"
                  onClick={() => logSet(si)}
                  disabled={row.done}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: "none",
                    cursor: row.done ? "default" : "pointer",
                    background: row.done ? C.positiveSoft : C.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={16} color={row.done ? C.positive : "#1A1006"} />
                </button>
              </div>
            ))
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "22px 1fr 1fr 1fr 36px 40px",
                  gap: 6,
                  padding: "0 2px",
                }}
              >
                <span />
                <Label>kg</Label>
                <Label>reps</Label>
                <Label>rpe</Label>
                <span />
                <span />
              </div>
              {currentRows.map((row, si) => (
                <div
                  key={si}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "22px 1fr 1fr 1fr 36px 40px",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textFaint }}>
                    {si + 1}
                  </span>
                  <SetInput
                    value={row.weight != null ? String(row.weight) : ""}
                    onChange={(v) => setRowStr(si, "weight", v)}
                    disabled={row.done}
                  />
                  <SetInput
                    value={row.reps != null ? String(row.reps) : ""}
                    onChange={(v) => setRowStr(si, "reps", v)}
                    disabled={row.done}
                  />
                  <SetInput
                    value={row.rpe != null ? String(row.rpe) : ""}
                    onChange={(v) => setRowStr(si, "rpe", v)}
                    disabled={row.done}
                  />
                  <button
                    type="button"
                    onClick={() => repeatLast(si)}
                    disabled={row.done}
                    title="Repeat last"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: `1px solid ${C.borderSoft}`,
                      background: C.surface2,
                      cursor: row.done ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: row.done ? 0.3 : 1,
                    }}
                  >
                    <Copy size={12} color={C.textMuted} />
                  </button>
                  <button
                    type="button"
                    onClick={() => logSet(si)}
                    disabled={row.done}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "none",
                      cursor: row.done ? "default" : "pointer",
                      background: row.done ? C.positiveSoft : C.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={16} color={row.done ? C.positive : "#1A1006"} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {resting && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 40px)",
            maxWidth: 390,
            background: C.surface3,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            animation: "popIn .25s ease",
            zIndex: 20,
            boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
          }}
        >
          <div>
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: C.textMuted }}>Resting</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 24, color: C.accent, fontWeight: 600 }}>
              {fmtClock(restLeft)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setResting(false);
              if (timerRef.current) clearInterval(timerRef.current);
            }}
            style={{
              background: C.surface2,
              border: `1px solid ${C.borderSoft}`,
              borderRadius: 10,
              padding: "8px 16px",
              color: C.textMuted,
              fontFamily: FONTS.body,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            background: toast.pr ? C.accentSoft : C.surface3,
            border: `1px solid ${toast.pr ? C.accentDim : C.border}`,
            borderRadius: 12,
            padding: "9px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "popIn .25s ease",
          }}
        >
          {toast.pr && <Award size={15} color={C.accent} />}
          <span
            style={{
              fontFamily: FONTS.body,
              fontSize: 13,
              color: toast.pr ? C.accent : C.text,
              fontWeight: 500,
            }}
          >
            {toast.text}
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          style={{ ...navBtnStyle, opacity: idx === 0 ? 0.35 : 1 }}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={finish}
            style={{ ...navBtnStyle, background: C.positive, color: "#08231C", border: "none", flex: 2 }}
          >
            Finish session <Check size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(exercises.length - 1, i + 1))}
            style={{ ...navBtnStyle, background: C.accent, color: "#1A1006", border: "none", flex: 2 }}
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
