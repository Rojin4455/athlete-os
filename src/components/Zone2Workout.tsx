import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import { fmtClock } from "../lib/dates";
import {
  getZone2,
  CALISTHENICS_SKILLS,
  MOBILITY_ITEMS,
  type SessionDef,
} from "../data/program";
import type { ActiveWorkoutDraft } from "../db";

interface Props {
  session: SessionDef;
  week: number;
  onExit: () => void;
  onFinish: (extras: {
    zone2Minutes?: number;
    zone2AvgHr?: number;
    zone2DistanceKm?: number;
    zone2Notes?: string;
    calisthenicsDone?: string[];
    mobilityDone?: string[];
  }) => void;
  elapsedSec: number;
  initialExtras?: ActiveWorkoutDraft["extras"];
  onDraftChange?: (extras: ActiveWorkoutDraft["extras"]) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: C.surface2,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: C.text,
  fontFamily: FONTS.mono,
  fontSize: 15,
  outline: "none",
};

export function Zone2Workout({
  session,
  week,
  onExit,
  onFinish,
  elapsedSec,
  initialExtras,
  onDraftChange,
}: Props) {
  const protocol = getZone2(week);
  const [minutes, setMinutes] = useState(
    initialExtras?.zone2Minutes ?? String(protocol.durationMin || 20),
  );
  const [avgHr, setAvgHr] = useState(initialExtras?.zone2AvgHr ?? "");
  const [distance, setDistance] = useState(initialExtras?.zone2DistanceKm ?? "");
  const [notes, setNotes] = useState(initialExtras?.zone2Notes ?? "");
  const [calis, setCalis] = useState<Record<string, boolean>>(initialExtras?.calis ?? {});
  const [mobility, setMobility] = useState<Record<string, boolean>>(initialExtras?.mobility ?? {});
  const [cardioDone, setCardioDone] = useState(initialExtras?.cardioDone ?? false);
  const saveTimer = useRef<number | null>(null);
  const stateRef = useRef({ minutes, avgHr, distance, notes, calis, mobility, cardioDone });
  stateRef.current = { minutes, avgHr, distance, notes, calis, mobility, cardioDone };

  const flush = (patch?: Partial<typeof stateRef.current>) => {
    if (!onDraftChange) return;
    const s = { ...stateRef.current, ...patch };
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      onDraftChange({
        zone2Minutes: s.minutes,
        zone2AvgHr: s.avgHr,
        zone2DistanceKm: s.distance,
        zone2Notes: s.notes,
        calis: s.calis,
        mobility: s.mobility,
        cardioDone: s.cardioDone,
      });
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      const s = stateRef.current;
      onDraftChange?.({
        zone2Minutes: s.minutes,
        zone2AvgHr: s.avgHr,
        zone2DistanceKm: s.distance,
        zone2Notes: s.notes,
        calis: s.calis,
        mobility: s.mobility,
        cardioDone: s.cardioDone,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (
    map: Record<string, boolean>,
    setMap: (m: Record<string, boolean>) => void,
    id: string,
    key: "calis" | "mobility",
  ) => {
    const next = { ...map, [id]: !map[id] };
    setMap(next);
    flush({ [key]: next });
  };

  const finish = () => {
    onFinish({
      zone2Minutes: parseFloat(minutes) || 0,
      zone2AvgHr: avgHr ? parseFloat(avgHr) : undefined,
      zone2DistanceKm: distance ? parseFloat(distance) : undefined,
      zone2Notes: notes || undefined,
      calisthenicsDone: Object.keys(calis).filter((k) => calis[k]),
      mobilityDone: Object.keys(mobility).filter((k) => mobility[k]),
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
        Week {week} · {protocol.paceGuide} · RPE {protocol.rpe}
      </div>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.borderSoft}`,
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, marginBottom: 10 }}>
          ZONE 2 LOG
        </div>
        <label style={{ display: "block", marginBottom: 10 }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: C.textFaint, marginBottom: 4 }}>
            Minutes
          </div>
          <input
            style={inputStyle}
            value={minutes}
            onChange={(e) => {
              setMinutes(e.target.value);
              flush({ minutes: e.target.value });
            }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 10 }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: C.textFaint, marginBottom: 4 }}>
            Avg HR
          </div>
          <input
            style={inputStyle}
            value={avgHr}
            onChange={(e) => {
              setAvgHr(e.target.value);
              flush({ avgHr: e.target.value });
            }}
            placeholder={protocol.hrZone}
          />
        </label>
        <label style={{ display: "block", marginBottom: 10 }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: C.textFaint, marginBottom: 4 }}>
            Distance km
          </div>
          <input
            style={inputStyle}
            value={distance}
            onChange={(e) => {
              setDistance(e.target.value);
              flush({ distance: e.target.value });
            }}
          />
        </label>
        <label style={{ display: "block" }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: C.textFaint, marginBottom: 4 }}>
            Notes
          </div>
          <input
            style={inputStyle}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              flush({ notes: e.target.value });
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setCardioDone(true);
            flush({ cardioDone: true });
          }}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "11px 0",
            borderRadius: 11,
            border: `1px solid ${cardioDone ? C.positive : C.border}`,
            background: cardioDone ? C.positiveSoft : C.surface2,
            color: cardioDone ? C.positive : C.text,
            fontFamily: FONTS.body,
            cursor: "pointer",
          }}
        >
          {cardioDone ? "Cardio logged ✓" : "Mark cardio done"}
        </button>
      </div>

      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint, marginBottom: 8 }}>
        CALISTHENICS
      </div>
      {CALISTHENICS_SKILLS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => toggle(calis, setCalis, s.id, "calis")}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "12px 12px",
            marginBottom: 8,
            borderRadius: 12,
            border: `1px solid ${calis[s.id] ? "rgba(79,209,174,0.35)" : C.borderSoft}`,
            background: calis[s.id] ? C.positiveSoft : C.surface,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {calis[s.id] ? <Check size={14} color={C.positive} /> : null}
            <div>
              <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: C.text }}>
                {s.name}
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {s.detail}
              </div>
            </div>
          </div>
        </button>
      ))}

      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint, margin: "14px 0 8px" }}>
        MOBILITY
      </div>
      {MOBILITY_ITEMS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => toggle(mobility, setMobility, m.id, "mobility")}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "11px 12px",
            marginBottom: 6,
            borderRadius: 11,
            border: `1px solid ${mobility[m.id] ? "rgba(79,209,174,0.35)" : C.borderSoft}`,
            background: mobility[m.id] ? C.positiveSoft : C.surface,
            color: C.text,
            fontFamily: FONTS.body,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {mobility[m.id] ? "✓ " : ""}
          {m.name}
          <span style={{ color: C.textFaint }}> — {m.detail}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={finish}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "14px 0",
          borderRadius: 13,
          border: "none",
          background: C.accent,
          color: "#0B0E12",
          fontFamily: FONTS.body,
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Finish session
      </button>
    </div>
  );
}
