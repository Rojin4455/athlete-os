import { useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import { fmtClock } from "../lib/dates";
import {
  getZone2,
  CALISTHENICS_SKILLS,
  MOBILITY_ITEMS,
  type SessionDef,
} from "../data/program";

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

export function Zone2Workout({ session, week, onExit, onFinish, elapsedSec }: Props) {
  const protocol = getZone2(week);
  const [minutes, setMinutes] = useState(String(protocol.durationMin || 20));
  const [avgHr, setAvgHr] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [calis, setCalis] = useState<Record<string, boolean>>({});
  const [mobility, setMobility] = useState<Record<string, boolean>>({});
  const [cardioDone, setCardioDone] = useState(false);

  const toggle = (
    map: Record<string, boolean>,
    setMap: (m: Record<string, boolean>) => void,
    id: string,
  ) => setMap({ ...map, [id]: !map[id] });

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
        Week {week} protocol
      </div>

      {/* Zone 2 block */}
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
          ZONE 2 CARDIO
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
          {protocol.durationMin > 0
            ? `${protocol.durationMin} min · ${protocol.paceGuide} · incline ${protocol.incline}`
            : protocol.paceGuide}
          <br />
          HR {protocol.hrZone} · RPE {protocol.rpe}
          {protocol.notes ? (
            <>
              <br />
              <span style={{ color: C.textFaint }}>{protocol.notes}</span>
            </>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, marginBottom: 4 }}>min</div>
            <input style={inputStyle} inputMode="decimal" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <div>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, marginBottom: 4 }}>avg HR</div>
            <input style={inputStyle} inputMode="numeric" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} placeholder="—" />
          </div>
          <div>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, marginBottom: 4 }}>km</div>
            <input style={inputStyle} inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="—" />
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Pace notes, how it felt…"
          rows={2}
          style={{
            ...inputStyle,
            fontFamily: FONTS.body,
            fontSize: 13,
            resize: "vertical",
            marginBottom: 12,
          }}
        />
        <button
          type="button"
          onClick={() => setCardioDone(true)}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            background: cardioDone ? C.positiveSoft : C.accent,
            color: cardioDone ? C.positive : "#1A1006",
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Check size={16} /> {cardioDone ? "Cardio logged" : "Log cardio"}
        </button>
      </div>

      {/* Calisthenics */}
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
          CALISTHENICS SKILL
        </div>
        {CALISTHENICS_SKILLS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(calis, setCalis, s.id)}
            style={{
              width: "100%",
              textAlign: "left",
              background: calis[s.id] ? C.positiveSoft : C.surface2,
              border: `1px solid ${calis[s.id] ? C.positive : C.borderSoft}`,
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 8,
              cursor: "pointer",
            }}
          >
            <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: C.text }}>
              {s.name}
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {s.detail}
            </div>
          </button>
        ))}
      </div>

      {/* Mobility */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.borderSoft}`,
          borderRadius: 18,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, letterSpacing: 1, marginBottom: 12 }}>
          MOBILITY (~15 MIN)
        </div>
        {MOBILITY_ITEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(mobility, setMobility, s.id)}
            style={{
              width: "100%",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: mobility[s.id] ? C.positiveSoft : C.surface2,
              border: `1px solid ${mobility[s.id] ? C.positive : C.borderSoft}`,
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 6,
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 500, color: C.text }}>
                {s.name}
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint }}>{s.detail}</div>
            </div>
            {mobility[s.id] && <Check size={16} color={C.positive} />}
          </button>
        ))}
      </div>

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
