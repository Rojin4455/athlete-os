import { C, FONTS } from "../lib/tokens";
import {
  type SessionDef,
  getZone2,
  getSprint,
  footballDrillsForWeek,
  CALISTHENICS_SKILLS,
  MOBILITY_ITEMS,
} from "../data/program";
import type { ExerciseHistory } from "../db";

interface Props {
  session: SessionDef;
  week: number;
  history?: Record<string, ExerciseHistory>;
  customized?: boolean;
}

export function SessionDetail({ session, week, history, customized }: Props) {
  if (session.kind === "rest") {
    return (
      <p style={body}>
        Full rest. Optional easy walk + mobility. Sleep and hydration do the work.
      </p>
    );
  }

  if (session.kind === "zone2") {
    const z2 = getZone2(week);
    const sprint = getSprint(week);
    return (
      <div>
        {session.why && <p style={{ ...body, marginBottom: 10 }}>{session.why}</p>}
        <Row label="Zone 2" value={`${z2.durationMin > 0 ? `${z2.durationMin} min` : "Test"} · ${z2.paceGuide}`} />
        <Row label="HR / RPE" value={`${z2.hrZone} · RPE ${z2.rpe}`} />
        <Row label="Incline" value={z2.incline} />
        {z2.notes && <Row label="Notes" value={z2.notes} />}
        <div style={{ ...label, marginTop: 14 }}>Sprint protocol (Sat curved / FOOTBALL day)</div>
        <Row
          label="This week"
          value={
            sprint.sprintSec
              ? `${sprint.reps}×${sprint.sprintSec}s × ${sprint.sets} · ${sprint.recoverySec}s rest`
              : sprint.notes
          }
        />
        <div style={{ ...label, marginTop: 14 }}>Calisthenics block</div>
        {CALISTHENICS_SKILLS.map((s) => (
          <div key={s.id} style={{ marginBottom: 8 }}>
            <div style={name}>{s.name}</div>
            <div style={mute}>{s.detail}</div>
          </div>
        ))}
        <div style={{ ...label, marginTop: 14 }}>Mobility</div>
        {MOBILITY_ITEMS.map((m) => (
          <div key={m.id} style={{ marginBottom: 6 }}>
            <span style={name}>{m.name}</span>
            <span style={mute}> — {m.detail}</span>
          </div>
        ))}
      </div>
    );
  }

  if (session.kind === "football") {
    const drills = footballDrillsForWeek(week);
    const sprint = getSprint(week);
    return (
      <div>
        {session.why && <p style={{ ...body, marginBottom: 10 }}>{session.why}</p>}
        {drills.map((d) => (
          <div key={d.id} style={{ marginBottom: 10 }}>
            <div style={name}>{d.name}</div>
            <div style={mute}>{d.detail}</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, marginTop: 2 }}>{d.reps}</div>
          </div>
        ))}
        <div style={{ ...label, marginTop: 8 }}>Curved treadmill</div>
        <Row
          label="Protocol"
          value={
            sprint.sprintSec
              ? `${sprint.reps}×${sprint.sprintSec}s × ${sprint.sets}`
              : sprint.notes
          }
        />
      </div>
    );
  }

  // strength
  return (
    <div>
      {customized && (
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.accent, marginBottom: 8 }}>
          CUSTOMIZED FROM PROGRAM
        </div>
      )}
      {session.why && <p style={{ ...body, marginBottom: 12 }}>{session.why}</p>}
      {(session.exercises ?? []).map((ex, i) => {
        const h = history?.[ex.id];
        return (
          <div
            key={ex.id}
            style={{
              padding: "10px 0",
              borderTop: i === 0 ? "none" : `1px solid ${C.borderSoft}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={name}>
                {i + 1}. {ex.name}
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textMuted, flexShrink: 0 }}>
                {ex.isFinisher
                  ? `${ex.finisherMinutes ?? 10} min`
                  : ex.isCircuit
                    ? `${ex.sets} rounds`
                    : `${ex.sets}×${ex.repRange}`}
              </div>
            </div>
            {!ex.isFinisher && !ex.isCircuit && (
              <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint, marginTop: 3 }}>
                RPE {ex.rpeTarget} · rest {ex.restSec}s · {ex.tempo}
              </div>
            )}
            {ex.cue && <div style={{ ...mute, marginTop: 4 }}>{ex.cue}</div>}
            {h && (
              <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.positive, marginTop: 4 }}>
                Last {h.last.weight}kg × {h.last.reps}
                {h.last.rpe != null ? ` @${h.last.rpe}` : ""} · best {h.bestWeight}kg
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={labelStyle}>{label}</div>
      <div style={body}>{value}</div>
    </div>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONTS.body,
  fontSize: 13,
  color: C.textMuted,
  lineHeight: 1.45,
  margin: 0,
};
const name: React.CSSProperties = {
  fontFamily: FONTS.display,
  fontSize: 13.5,
  fontWeight: 600,
  color: C.text,
};
const mute: React.CSSProperties = {
  fontFamily: FONTS.body,
  fontSize: 12,
  color: C.textFaint,
  lineHeight: 1.4,
};
const label: React.CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: 10,
  color: C.accent,
  letterSpacing: 0.6,
  marginBottom: 6,
};
const labelStyle = label;
