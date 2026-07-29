import { C, FONTS } from "../lib/tokens";

interface Props {
  score: number;
  size?: number;
}

export function ReadinessRing({ score, size = 128 }: Props) {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(Math.max(score, 0), 100) / 100) * circ;
  const color = score >= 70 ? C.positive : score >= 45 ? C.accent : C.warning;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke={C.borderSoft} strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke .3s" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: FONTS.mono, fontSize: 30, fontWeight: 600, color: C.text, lineHeight: 1 }}>
          {score}
        </span>
        <span
          style={{
            fontFamily: FONTS.body,
            fontSize: 10,
            color: C.textMuted,
            marginTop: 4,
            letterSpacing: 0.4,
          }}
        >
          READINESS
        </span>
      </div>
    </div>
  );
}
