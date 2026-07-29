import { useState, useEffect } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import { fmtClock } from "../lib/dates";
import {
  footballDrillsForWeek,
  getSprint,
  type SessionDef,
} from "../data/program";

interface Props {
  session: SessionDef;
  week: number;
  onExit: () => void;
  onFinish: (extras: {
    drillsDone?: string[];
    sprintTimes?: number[];
    notes?: string;
  }) => void;
  elapsedSec: number;
}

export function FootballWorkout({ session, week, onExit, onFinish, elapsedSec }: Props) {
  const drills = footballDrillsForWeek(week);
  const sprint = getSprint(week);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [sprintTimes, setSprintTimes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const hasSprints = sprint.sprintSec != null && sprint.reps != null;
  const totalSprintReps = hasSprints ? (sprint.reps! * (sprint.sets || 1)) : 0;

  useEffect(() => {
    if (totalSprintReps > 0) {
      setSprintTimes(Array.from({ length: totalSprintReps }, () => ""));
    }
  }, [totalSprintReps]);

  const finish = () => {
    onFinish({
      drillsDone: Object.keys(done).filter((k) => done[k]),
      sprintTimes: sprintTimes.map((t) => parseFloat(t)).filter((n) => !Number.isNaN(n) && n > 0),
      notes: notes || undefined,
    });
  };

  return (
    <div style={{ padding: "20px 20px 28px", animation: "fadeUp .3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <button
          type="button"
          onClick={onExit}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: C.surface2,
            border: `1px solid ${C.borderSoft}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={18} color={C.textMuted} />
        </button>
        <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.textMuted }}>
          {fmtClock(elapsedSec)}
        </div>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        {session.name}
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginBottom: 18 }}>
        Week {week} · {session.focus}
      </div>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.borderSoft}`,
          borderRadius: 18,
          padding: 18,
          marginBottom: 12,
        }}
      >
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 12 }}>
          DRILLS
        </div>
        {drills.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDone({ ...done, [d.id]: !done[d.id] })}
            style={{
              width: "100%",
              textAlign: "left",
              background: done[d.id] ? C.positiveSoft : C.surface2,
              border: `1px solid ${done[d.id] ? C.positive : C.borderSoft}`,
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 8,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: C.text }}>
                {d.name}
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {d.detail}
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint, marginTop: 4 }}>
                {d.reps}
              </div>
            </div>
            {done[d.id] && <Check size={16} color={C.positive} style={{ flexShrink: 0, marginTop: 2 }} />}
          </button>
        ))}
      </div>

      {/* Sprint protocol */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.borderSoft}`,
          borderRadius: 18,
          padding: 18,
          marginBottom: 12,
        }}
      >
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 10 }}>
          CURVED TREADMILL SPRINTS
        </div>
        {!hasSprints ? (
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
            {sprint.notes || "Not scheduled this week — build Zone 2 base first."}
          </div>
        ) : (
          <>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
              {sprint.sprintSec}s max · {sprint.recoverySec}s recovery · {sprint.reps} reps
              {sprint.sets && sprint.sets > 1 ? ` × ${sprint.sets} sets` : ""}
              {sprint.notes ? (
                <>
                  <br />
                  <span style={{ color: C.textFaint }}>{sprint.notes}</span>
                </>
              ) : null}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Array.from({ length: totalSprintReps }, (_, i) => (
                <div key={i}>
                  <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, marginBottom: 4 }}>
                    Rep {i + 1} (s)
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={sprintTimes[i] ?? ""}
                    onChange={(e) => {
                      const next = [...sprintTimes];
                      while (next.length < totalSprintReps) next.push("");
                      next[i] = e.target.value;
                      setSprintTimes(next);
                    }}
                    style={{
                      width: "100%",
                      background: C.surface2,
                      border: `1px solid ${C.borderSoft}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      color: C.text,
                      fontFamily: FONTS.mono,
                      fontSize: 15,
                      outline: "none",
                    }}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Session notes, gassing onset…"
        rows={2}
        style={{
          width: "100%",
          background: C.surface2,
          border: `1px solid ${C.borderSoft}`,
          borderRadius: 10,
          padding: "10px 12px",
          color: C.text,
          fontFamily: FONTS.body,
          fontSize: 13,
          outline: "none",
          resize: "vertical",
          marginBottom: 16,
        }}
      />

      <button
        type="button"
        onClick={finish}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 14,
          border: "none",
          background: C.positive,
          color: "#08231C",
          fontFamily: FONTS.body,
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        Finish session <Check size={16} />
      </button>
    </div>
  );
}
