import { C, FONTS } from "../../lib/tokens";

export interface ChartPoint {
  x: number; // 0..1
  y: number; // value
  label?: string;
  rpe?: number | null;
}

interface LineChartProps {
  width?: number;
  height?: number;
  series: { points: ChartPoint[]; color: string; strokeWidth?: number; dashed?: boolean }[];
  /** Raw scatter on top of first series (e.g. daily weight dots) */
  dots?: { x: number; y: number; rpe?: number | null }[];
  yMin?: number;
  yMax?: number;
  formatY?: (v: number) => string;
  emptyLabel?: string;
}

function padRange(min: number, max: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.12;
  return [min - pad, max + pad];
}

export function LineChart({
  width = 360,
  height = 160,
  series,
  dots,
  yMin,
  yMax,
  formatY = (v) => String(Math.round(v * 10) / 10),
  emptyLabel = "No data yet",
}: LineChartProps) {
  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  if (dots) allY.push(...dots.map((d) => d.y));
  if (allY.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.textFaint,
          fontFamily: FONTS.body,
          fontSize: 13,
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  const [lo, hi] = padRange(yMin ?? Math.min(...allY), yMax ?? Math.max(...allY));
  const left = 36;
  const right = 10;
  const top = 12;
  const bottom = 22;
  const iw = width - left - right;
  const ih = height - top - bottom;

  const sx = (x: number) => left + x * iw;
  const sy = (y: number) => top + ((hi - y) / (hi - lo)) * ih;

  const ticks = [lo, (lo + hi) / 2, hi];

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={left}
            x2={left + iw}
            y1={sy(t)}
            y2={sy(t)}
            stroke={C.borderSoft}
            strokeWidth={1}
          />
          <text
            x={left - 6}
            y={sy(t) + 3}
            textAnchor="end"
            fill={C.textFaint}
            style={{ fontFamily: FONTS.mono, fontSize: 9 }}
          >
            {formatY(t)}
          </text>
        </g>
      ))}

      {series.map((s, si) => {
        if (s.points.length < 2) return null;
        const d = s.points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
          .join(" ");
        return (
          <path
            key={si}
            d={d}
            fill="none"
            stroke={s.color}
            strokeWidth={s.strokeWidth ?? 2}
            strokeDasharray={s.dashed ? "4 4" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {(dots ?? series[0]?.points ?? []).map((p, i) => {
        const rpe = "rpe" in p ? p.rpe : undefined;
        const r = rpe != null ? 2.5 + Math.min(3, Math.max(0, (rpe - 5) * 0.5)) : 3;
        const fill =
          rpe != null && rpe >= 9 ? C.warning : rpe != null && rpe >= 8 ? C.accent : C.accent;
        return (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={r}
            fill={fill}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
}

/** Map chronological points onto 0..1 x axis */
export function toChartPoints(
  values: { y: number; label?: string; rpe?: number | null }[],
): ChartPoint[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [{ x: 0.5, y: values[0].y, label: values[0].label, rpe: values[0].rpe }];
  return values.map((v, i) => ({
    x: i / (values.length - 1),
    y: v.y,
    label: v.label,
    rpe: v.rpe,
  }));
}
