import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Pencil } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import {
  WEEK_TEMPLATE,
  SESSIONS,
  CALISTHENICS_SKILLS,
  MOBILITY_ITEMS,
  getZone2,
  getSprint,
  exerciseNameMap,
  type SessionDef,
} from "../data/program";
import { getHistory, type ExerciseHistory } from "../db";
import {
  getEffectiveSession,
  getSessionOverride,
  isCustomized,
} from "../db/overrides";
import { SessionDetail } from "./SessionDetail";
import { SessionEditor } from "./SessionEditor";

interface Props {
  week: number;
  onStartSession?: (sessionId: string) => void;
}

type View =
  | { kind: "home" }
  | { kind: "session"; sessionId: string }
  | { kind: "exercise"; exerciseId: string }
  | { kind: "calisthenics" }
  | { kind: "mobility" }
  | { kind: "cardio" };

export function TrainScreen({ week, onStartSession }: Props) {
  const [view, setView] = useState<View>({ kind: "home" });
  const [session, setSession] = useState<SessionDef | null>(null);
  const [customized, setCustomized] = useState(false);
  const [history, setHistory] = useState<Record<string, ExerciseHistory>>({});
  const [editing, setEditing] = useState(false);
  const [exHistory, setExHistory] = useState<ExerciseHistory | undefined>();
  const names = exerciseNameMap();

  const loadSession = useCallback(async (sessionId: string) => {
    const eff = await getEffectiveSession(sessionId);
    const ov = await getSessionOverride(sessionId);
    setSession(eff);
    setCustomized(isCustomized(sessionId, ov));
    const hist: Record<string, ExerciseHistory> = {};
    for (const ex of eff.exercises ?? []) {
      const h = await getHistory(ex.id);
      if (h) hist[ex.id] = h;
    }
    setHistory(hist);
  }, []);

  useEffect(() => {
    if (view.kind === "session") void loadSession(view.sessionId);
  }, [view, loadSession]);

  useEffect(() => {
    if (view.kind === "exercise") {
      void getHistory(view.exerciseId).then(setExHistory);
    }
  }, [view]);

  if (view.kind === "session" && session) {
    return (
      <div style={{ padding: "24px 18px 8px", animation: "fadeUp .3s ease" }}>
        <Back onClick={() => setView({ kind: "home" })} />
        <Header
          eyebrow="SESSION"
          title={session.name}
          sub={`${session.focus}${customized ? " · customized" : ""}`}
        />
        {session.kind === "strength" && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={secondaryBtn}
          >
            <Pencil size={14} />
            Edit workout
          </button>
        )}
        <div style={card}>
          <SessionDetail session={session} week={week} history={history} customized={customized} />
        </div>
        {session.kind === "strength" && (
          <div style={{ marginTop: 12 }}>
            <div style={sectionLabel}>Exercises</div>
            {(session.exercises ?? []).map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setView({ kind: "exercise", exerciseId: ex.id })}
                style={rowBtn}
              >
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={rowTitle}>{ex.name}</div>
                  <div style={rowSub}>
                    {ex.isFinisher
                      ? "Finisher"
                      : ex.isCircuit
                        ? "Circuit"
                        : `${ex.sets}×${ex.repRange}`}
                    {history[ex.id] ? ` · last ${history[ex.id].last.weight}kg` : ""}
                  </div>
                </div>
                <ChevronRight size={16} color={C.textFaint} />
              </button>
            ))}
          </div>
        )}
        {onStartSession && session.kind !== "rest" && (
          <button
            type="button"
            onClick={() => onStartSession(session.id)}
            style={primaryBtn}
          >
            Start from Train
          </button>
        )}
        {editing && session.exercises && (
          <SessionEditor
            sessionId={session.id}
            initial={session.exercises}
            onClose={() => setEditing(false)}
            onSaved={() => void loadSession(session.id)}
          />
        )}
      </div>
    );
  }

  if (view.kind === "exercise") {
    const name = names[view.exerciseId] ?? view.exerciseId;
    // find cue from any session
    let cue = "";
    for (const s of Object.values(SESSIONS)) {
      const found = s.exercises?.find((e) => e.id === view.exerciseId);
      if (found) {
        cue = found.cue;
        break;
      }
    }
    return (
      <div style={{ padding: "24px 18px 8px", animation: "fadeUp .3s ease" }}>
        <Back onClick={() => setView({ kind: "home" })} />
        <Header eyebrow="EXERCISE" title={name} sub={cue || "Cue from program"} />
        <div style={card}>
          {exHistory ? (
            <>
              <Stat label="Last" value={`${exHistory.last.weight}kg × ${exHistory.last.reps}`} />
              <Stat label="Best weight" value={`${exHistory.bestWeight}kg`} />
              <Stat label="Best e1RM" value={`${exHistory.bestE1rm.toFixed(0)}kg`} />
              <Stat label="Last date" value={exHistory.last.date} />
            </>
          ) : (
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textFaint, margin: 0 }}>
              No logged sets yet — history appears after you train this lift.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (view.kind === "calisthenics") {
    return (
      <div style={{ padding: "24px 18px 8px" }}>
        <Back onClick={() => setView({ kind: "home" })} />
        <Header eyebrow="SKILLS" title="Calisthenics" sub="Progress only when rep targets are clean" />
        {CALISTHENICS_SKILLS.map((s) => (
          <div key={s.id} style={{ ...card, marginBottom: 10 }}>
            <div style={rowTitle}>{s.name}</div>
            <div style={{ ...rowSub, marginTop: 4 }}>{s.detail}</div>
          </div>
        ))}
      </div>
    );
  }

  if (view.kind === "mobility") {
    return (
      <div style={{ padding: "24px 18px 8px" }}>
        <Back onClick={() => setView({ kind: "home" })} />
        <Header eyebrow="ROUTINE" title="Mobility" sub="Full list Wed/Sat · 5-min subset pre-lift" />
        {MOBILITY_ITEMS.map((m) => (
          <div key={m.id} style={{ ...card, marginBottom: 10 }}>
            <div style={rowTitle}>{m.name}</div>
            <div style={{ ...rowSub, marginTop: 4 }}>{m.detail}</div>
          </div>
        ))}
      </div>
    );
  }

  if (view.kind === "cardio") {
    const z2 = getZone2(week);
    const sprint = getSprint(week);
    return (
      <div style={{ padding: "24px 18px 8px" }}>
        <Back onClick={() => setView({ kind: "home" })} />
        <Header eyebrow="PROTOCOLS" title="Cardio & sprints" sub={`Week ${week} prescription`} />
        <div style={card}>
          <div style={sectionLabel}>ZONE 2</div>
          <Stat label="Duration" value={z2.durationMin > 0 ? `${z2.durationMin} min` : "Test day"} />
          <Stat label="Pace" value={z2.paceGuide} />
          <Stat label="HR zone" value={z2.hrZone} />
          <Stat label="RPE" value={z2.rpe} />
          {z2.notes && <Stat label="Notes" value={z2.notes} />}
        </div>
        <div style={{ ...card, marginTop: 10 }}>
          <div style={sectionLabel}>CURVED SPRINTS</div>
          <Stat
            label="Session"
            value={
              sprint.sprintSec
                ? `${sprint.reps}×${sprint.sprintSec}s × ${sprint.sets} · ${sprint.recoverySec}s rest`
                : sprint.notes
            }
          />
          {sprint.notes && sprint.sprintSec && <Stat label="Notes" value={sprint.notes} />}
        </div>
      </div>
    );
  }

  // home
  return (
    <div style={{ padding: "24px 18px 8px", animation: "fadeUp .35s ease" }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, letterSpacing: 1.2, marginBottom: 6 }}>
        TRAIN
      </div>
      <div style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 600, color: C.text, marginBottom: 16 }}>
        Library
      </div>

      <div style={sectionLabel}>WORKOUT LIBRARY</div>
      {WEEK_TEMPLATE.filter((d) => d.sessionId !== "rest").map((d) => {
        const s = SESSIONS[d.sessionId];
        return (
          <button
            key={d.sessionId}
            type="button"
            onClick={() => setView({ kind: "session", sessionId: d.sessionId })}
            style={rowBtn}
          >
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={rowTitle}>
                {d.d} · {s.name}
              </div>
              <div style={rowSub}>
                {s.focus}
                {s.exercises ? ` · ${s.exercises.length} movements` : ""}
              </div>
            </div>
            <ChevronRight size={16} color={C.textFaint} />
          </button>
        );
      })}

      <div style={{ ...sectionLabel, marginTop: 18 }}>MORE</div>
      {(
        [
          ["calisthenics", "Calisthenics progressions"],
          ["mobility", "Mobility routine"],
          ["cardio", "Zone 2 + sprint protocols"],
        ] as const
      ).map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          onClick={() => setView({ kind })}
          style={rowBtn}
        >
          <div style={{ flex: 1, textAlign: "left", ...rowTitle }}>{label}</div>
          <ChevronRight size={16} color={C.textFaint} />
        </button>
      ))}
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        color: C.accent,
        fontFamily: FONTS.body,
        fontSize: 13,
        padding: 0,
        marginBottom: 12,
        cursor: "pointer",
      }}
    >
      ← Back
    </button>
  );
}

function Header({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <>
      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 6 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
        {sub}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint }}>{label}</div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 14, color: C.text, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 16,
  padding: 14,
};
const sectionLabel: React.CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: 10,
  color: C.textFaint,
  letterSpacing: 0.8,
  marginBottom: 8,
};
const rowBtn: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "14px 14px",
  marginBottom: 8,
  borderRadius: 14,
  border: `1px solid ${C.borderSoft}`,
  background: C.surface,
  cursor: "pointer",
};
const rowTitle: React.CSSProperties = {
  fontFamily: FONTS.display,
  fontSize: 14,
  fontWeight: 600,
  color: C.text,
};
const rowSub: React.CSSProperties = {
  fontFamily: FONTS.body,
  fontSize: 12,
  color: C.textMuted,
  marginTop: 2,
};
const primaryBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
  padding: "14px 0",
  borderRadius: 13,
  border: "none",
  background: C.accent,
  color: "#0B0E12",
  fontFamily: FONTS.body,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  width: "100%",
  marginBottom: 12,
  padding: "11px 0",
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.surface2,
  color: C.text,
  fontFamily: FONTS.body,
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
};
