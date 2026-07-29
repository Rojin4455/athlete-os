import { Flame } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import { fmtClock } from "../lib/dates";
import { ReadinessRing } from "./ReadinessRing";

interface Stats {
  duration: number;
  volume: number;
  sets: number;
  prs: number;
  volumeDelta: number;
  sessionName: string;
  readinessScore?: number;
}

interface Props {
  stats: Stats;
  onDone: () => void;
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.borderSoft}`,
        borderRadius: 16,
        padding: "16px 14px",
        textAlign: "left",
      }}
    >
      <div style={{ fontFamily: FONTS.body, fontSize: 11, color: C.textFaint, marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 19,
          fontWeight: 600,
          color: accent ? C.positive : C.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function SummaryScreen({ stats, onDone }: Props) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center", animation: "fadeUp .35s ease" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: C.positiveSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <Flame size={28} color={C.positive} />
      </div>
      <div style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>
        Session complete
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginBottom: 24 }}>
        {stats.sessionName} · {fmtClock(stats.duration)}
      </div>

      {stats.readinessScore != null && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <ReadinessRing score={stats.readinessScore} size={96} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
        {stats.volume > 0 && (
          <SummaryStat label="Total volume" value={`${stats.volume.toLocaleString()} kg`} />
        )}
        {stats.sets > 0 && <SummaryStat label="Sets logged" value={String(stats.sets)} />}
        <SummaryStat label="PRs hit" value={String(stats.prs)} accent={stats.prs > 0} />
        {stats.volume > 0 && (
          <SummaryStat
            label="vs last time"
            value={stats.volumeDelta >= 0 ? `+${stats.volumeDelta}%` : `${stats.volumeDelta}%`}
            accent={stats.volumeDelta > 0}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onDone}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 14,
          border: "none",
          background: C.accent,
          color: "#1A1006",
          fontFamily: FONTS.body,
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Back to today
      </button>
    </div>
  );
}
