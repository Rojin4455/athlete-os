import { Check, Droplet, Moon, Scale, Play, Heart } from "lucide-react";
import { ReadinessRing } from "./ReadinessRing";
import { C, FONTS } from "../lib/tokens";
import { mondayIndexOf } from "../lib/dates";
import { WEEK_TEMPLATE, type SessionDef } from "../data/program";
import type { DailyLog } from "../db";
import type { ReadinessResult } from "../lib/readiness";

interface Props {
  daily: DailyLog;
  setDailyField: <K extends keyof DailyLog>(field: K, value: DailyLog[K]) => void;
  onStart: () => void;
  onDiscardInProgress?: () => void;
  hasInProgress?: boolean;
  weekStatus: Record<number, "done" | "partial">;
  session: SessionDef;
  week: number;
  phase: string;
  readiness: ReadinessResult;
}

const qBtnStyle: React.CSSProperties = {
  flex: 1,
  background: C.surface2,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 8,
  color: C.textMuted,
  fontFamily: FONTS.mono,
  fontSize: 13,
  padding: "3px 0",
  cursor: "pointer",
};

export function TodayScreen({
  daily,
  setDailyField,
  onStart,
  onDiscardInProgress,
  hasInProgress,
  weekStatus,
  session,
  week,
  phase,
  readiness,
}: Props) {
  const dayIdx = mondayIndexOf();
  const readinessScore = readiness.score;

  const waterTarget = 8;
  const isRest = session.kind === "rest";
  const exerciseCount = session.exercises?.filter((e) => !e.isFinisher).length ?? 0;

  return (
    <div style={{ padding: "28px 20px 24px", animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 12,
              color: C.accent,
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            WEEK {week} · {phase.toUpperCase()} PHASE
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 600, color: C.text }}>
            {WEEK_TEMPLATE[dayIdx].d} · Day {dayIdx + 1} of 7
          </div>
        </div>
      </div>

      {/* Readiness */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.borderSoft}`,
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <ReadinessRing score={readinessScore} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginBottom: 10 }}>
            How are you feeling today?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(
              [
                ["ready", "Ready"],
                ["okay", "Okay"],
                ["tired", "Tired"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDailyField("readiness", key)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 11,
                  fontFamily: FONTS.body,
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all .15s",
                  background: daily.readiness === key ? C.accentSoft : C.surface2,
                  color: daily.readiness === key ? C.accent : C.textMuted,
                  border: `1px solid ${daily.readiness === key ? C.accentDim : C.borderSoft}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {readiness.tip && (
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 11.5,
                color: readiness.score < 48 ? C.warning : C.textFaint,
                marginTop: 10,
                lineHeight: 1.4,
              }}
            >
              {readiness.tip}
            </div>
          )}
        </div>
      </div>

      {/* Today's session card */}
      <div
        style={{
          background: `linear-gradient(160deg, ${C.surface3}, ${C.surface2})`,
          border: `1px solid ${C.border}`,
          borderRadius: 22,
          padding: 22,
          marginBottom: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: C.accentSoft,
            filter: "blur(10px)",
          }}
        />
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: C.accent,
            letterSpacing: 1.2,
            marginBottom: 8,
            position: "relative",
          }}
        >
          TODAY'S SESSION
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 24,
            fontWeight: 700,
            color: C.text,
            marginBottom: 4,
            position: "relative",
          }}
        >
          {session.name}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 13,
            color: C.textMuted,
            marginBottom: 20,
            position: "relative",
          }}
        >
          {session.focus}
          {session.kind === "strength" && ` · ${exerciseCount} exercises · ~${session.estMinutes} min`}
          {session.kind === "zone2" && ` · ~${session.estMinutes} min`}
          {session.kind === "football" && ` · ~${session.estMinutes} min`}
          {isRest && " · recover hard"}
        </div>
        {!isRest ? (
          <>
            <button
              type="button"
              onClick={onStart}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                background: C.accent,
                color: "#1A1006",
                fontFamily: FONTS.body,
                fontWeight: 600,
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                position: "relative",
                boxShadow: `0 8px 20px -6px ${C.accentSoft}`,
              }}
            >
              <Play size={16} fill="#1A1006" /> {hasInProgress ? "Resume session" : "Start session"}
            </button>
            {hasInProgress && onDiscardInProgress && (
              <button
                type="button"
                onClick={onDiscardInProgress}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "10px 0",
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: "transparent",
                  color: C.textFaint,
                  fontFamily: FONTS.body,
                  fontSize: 13,
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                Discard in-progress
              </button>
            )}
          </>
        ) : (
          <div
            style={{
              position: "relative",
              fontFamily: FONTS.body,
              fontSize: 13,
              color: C.textMuted,
              padding: "12px 14px",
              background: C.surface,
              borderRadius: 12,
              border: `1px solid ${C.borderSoft}`,
            }}
          >
            Optional easy walk + mobility. Log sleep/water below — rest is the session.
          </div>
        )}
      </div>

      {/* Week strip */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: FONTS.body, fontSize: 12.5, color: C.textMuted, marginBottom: 10 }}>
          This week
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {WEEK_TEMPLATE.map((day, i) => {
            const isToday = i === dayIdx;
            const status = weekStatus[i];
            return (
              <div key={day.d} style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      isToday ? C.accentSoft : status === "done" ? C.positiveSoft : C.surface2,
                    border: `1.5px solid ${
                      isToday ? C.accent : status === "done" ? C.positive : C.borderSoft
                    }`,
                    marginBottom: 6,
                    transition: "all .2s",
                  }}
                >
                  {status === "done" ? (
                    <Check size={15} color={C.positive} />
                  ) : (
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 10,
                        color: isToday ? C.accent : C.textFaint,
                      }}
                    >
                      {day.d[0]}
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: FONTS.body, fontSize: 9, color: C.textFaint }}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick log */}
      <div style={{ fontFamily: FONTS.body, fontSize: 12.5, color: C.textMuted, marginBottom: 10 }}>
        Quick log
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: 16,
            padding: "14px 10px",
          }}
        >
          <Droplet size={16} color={C.accent} />
          <div style={{ fontFamily: FONTS.mono, fontSize: 18, color: C.text, marginTop: 8 }}>
            {daily.water}
            <span style={{ fontSize: 11, color: C.textFaint }}>/{waterTarget}</span>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setDailyField("water", Math.max(0, daily.water - 1))}
              style={qBtnStyle}
            >
              –
            </button>
            <button
              type="button"
              onClick={() => setDailyField("water", Math.min(12, daily.water + 1))}
              style={qBtnStyle}
            >
              +
            </button>
          </div>
        </div>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: 16,
            padding: "14px 10px",
          }}
        >
          <Moon size={16} color={C.accent} />
          <div style={{ fontFamily: FONTS.mono, fontSize: 18, color: C.text, marginTop: 8 }}>
            {daily.sleep ?? "–"}
            <span style={{ fontSize: 11, color: C.textFaint }}>h</span>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setDailyField("sleep", Math.max(0, (daily.sleep ?? 7) - 0.5))}
              style={qBtnStyle}
            >
              –
            </button>
            <button
              type="button"
              onClick={() => setDailyField("sleep", Math.min(12, (daily.sleep ?? 7) + 0.5))}
              style={qBtnStyle}
            >
              +
            </button>
          </div>
        </div>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: 16,
            padding: "14px 10px",
          }}
        >
          <Scale size={16} color={C.accent} />
          <div style={{ fontFamily: FONTS.mono, fontSize: 18, color: C.text, marginTop: 8 }}>
            {daily.weight != null ? daily.weight.toFixed(1) : "–"}
            <span style={{ fontSize: 11, color: C.textFaint }}>kg</span>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
            <button
              type="button"
              onClick={() =>
                setDailyField(
                  "weight",
                  Math.round(Math.max(0, (daily.weight ?? 68) - 0.2) * 10) / 10,
                )
              }
              style={qBtnStyle}
            >
              –
            </button>
            <button
              type="button"
              onClick={() =>
                setDailyField(
                  "weight",
                  Math.round(((daily.weight ?? 68) + 0.2) * 10) / 10,
                )
              }
              style={qBtnStyle}
            >
              +
            </button>
          </div>
        </div>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: 16,
            padding: "14px 10px",
          }}
        >
          <Heart size={16} color={C.accent} />
          <div style={{ fontFamily: FONTS.mono, fontSize: 18, color: C.text, marginTop: 8 }}>
            {daily.restingHr ?? "–"}
            <span style={{ fontSize: 11, color: C.textFaint }}>bpm</span>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
            <button
              type="button"
              onClick={() =>
                setDailyField("restingHr", Math.max(40, (daily.restingHr ?? 60) - 1))
              }
              style={qBtnStyle}
            >
              –
            </button>
            <button
              type="button"
              onClick={() =>
                setDailyField("restingHr", Math.min(120, (daily.restingHr ?? 60) + 1))
              }
              style={qBtnStyle}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
