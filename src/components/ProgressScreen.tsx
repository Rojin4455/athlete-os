import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, Camera, ChevronDown } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import { todayKey } from "../lib/dates";
import { TRACKED_LIFTS, exerciseNameMap } from "../data/program";
import {
  addPhoto,
  allPrs,
  compressImageFile,
  deletePhoto,
  listBodyComp,
  listPhotos,
  listWeightSeries,
  liftSeries,
  progressStats,
  rollingAvg7,
  saveBodyComp,
  type BodyCompLog,
  type LiftPoint,
  type PhotoPose,
  type ProgressPhoto,
} from "../db/progress";
import type { ExerciseHistory } from "../db";
import { LineChart, toChartPoints } from "./charts/LineChart";

const sectionStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 16,
  padding: "16px 16px 14px",
  marginBottom: 14,
};

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 600, color: C.text }}>
        {children}
      </div>
      {hint && (
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textFaint, marginTop: 3 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: C.surface2,
        borderRadius: 12,
        padding: "12px 10px",
      }}
    >
      <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 18, color: C.text, marginTop: 4 }}>
        {value}
        {unit && (
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 3 }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  step = "0.1",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, marginBottom: 5 }}>
        {label}
      </div>
      <input
        inputMode="decimal"
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 10px",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: C.surface2,
          color: C.text,
          fontFamily: FONTS.mono,
          fontSize: 14,
          outline: "none",
        }}
      />
    </label>
  );
}

export function ProgressScreen() {
  const names = useMemo(() => exerciseNameMap(), []);
  const [stats, setStats] = useState({
    latestWeight: null as number | null,
    latestBodyFat: null as number | null,
    sessionsLogged: 0,
    prCount: 0,
  });
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([]);
  const [comps, setComps] = useState<BodyCompLog[]>([]);
  const [liftId, setLiftId] = useState<string>(TRACKED_LIFTS[0]);
  const [liftPts, setLiftPts] = useState<LiftPoint[]>([]);
  const [prs, setPrs] = useState<ExerciseHistory[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [slider, setSlider] = useState(50);
  const [pose, setPose] = useState<PhotoPose>("front");
  const [bfDate, setBfDate] = useState(todayKey());
  const [bfFat, setBfFat] = useState("");
  const [bfMuscle, setBfMuscle] = useState("");
  const [bfWeight, setBfWeight] = useState("");
  const [savingBf, setSavingBf] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const [s, w, c, lp, p, ph] = await Promise.all([
      progressStats(),
      listWeightSeries(),
      listBodyComp(),
      liftSeries(liftId),
      allPrs(),
      listPhotos(),
    ]);
    setStats(s);
    setWeights(w);
    setComps(c);
    setLiftPts(lp);
    setPrs(p);
    setPhotos(ph);
    setCompareA((prev) => prev ?? ph[0]?.id ?? null);
    setCompareB((prev) => prev ?? ph[1]?.id ?? null);
  }, [liftId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const weightAvg = useMemo(() => rollingAvg7(weights), [weights]);
  const weightDots = toChartPoints(weights.map((w) => ({ y: w.weight, label: w.date })));
  const weightAvgLine = toChartPoints(weightAvg.map((a) => ({ y: a.avg, label: a.date })));
  const bfPoints = toChartPoints(
    comps.filter((c) => c.bodyFat != null).map((c) => ({ y: c.bodyFat as number, label: c.date })),
  );
  const liftChart = toChartPoints(
    liftPts.map((p) => ({ y: p.weight, label: p.date, rpe: p.rpe })),
  );

  const photoA = photos.find((p) => p.id === compareA) ?? null;
  const photoB = photos.find((p) => p.id === compareB) ?? null;

  const onSaveBf = async () => {
    setSavingBf(true);
    try {
      await saveBodyComp({
        date: bfDate,
        bodyFat: bfFat ? Number(bfFat) : null,
        muscleMass: bfMuscle ? Number(bfMuscle) : null,
        weight: bfWeight ? Number(bfWeight) : null,
      });
      setBfFat("");
      setBfMuscle("");
      setBfWeight("");
      await reload();
    } finally {
      setSavingBf(false);
    }
  };

  const onAddPhoto = async (file: File) => {
    const dataUrl = await compressImageFile(file);
    const row = await addPhoto({ date: todayKey(), pose, dataUrl });
    setPhotos((prev) => [row, ...prev]);
    if (!compareA) setCompareA(row.id);
    else if (!compareB) setCompareB(row.id);
  };

  return (
    <div style={{ padding: "24px 18px 8px", animation: "fadeUp .35s ease" }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, letterSpacing: 1.2, marginBottom: 6 }}>
        PROGRESS
      </div>
      <div style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 600, color: C.text, marginBottom: 16 }}>
        Is this working
      </div>

      {/* Dashboard */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <StatTile
          label="WEIGHT"
          value={stats.latestWeight != null ? stats.latestWeight.toFixed(1) : "—"}
          unit="kg"
        />
        <StatTile
          label="BODY FAT"
          value={stats.latestBodyFat != null ? stats.latestBodyFat.toFixed(1) : "—"}
          unit="%"
        />
        <StatTile label="SESSIONS" value={String(stats.sessionsLogged)} />
        <StatTile label="PRS" value={String(stats.prCount)} />
      </div>

      {/* Body weight */}
      <div style={sectionStyle}>
        <SectionTitle hint="Raw dots · 7-day average line">Body weight</SectionTitle>
        <LineChart
          series={[
            { points: weightAvgLine, color: C.accent, strokeWidth: 2 },
            { points: weightDots.length >= 2 ? weightDots : [], color: "transparent", strokeWidth: 0 },
          ]}
          dots={weightDots}
          emptyLabel="No scale weight yet — log on Today, or fill Weight kg on a Tanita scan"
          formatY={(v) => v.toFixed(1)}
        />
        {weights.length > 0 && (
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Latest {weights[weights.length - 1].weight.toFixed(1)} kg · {weights[weights.length - 1].date}
          </div>
        )}
      </div>

      {/* Body fat / Tanita */}
      <div style={sectionStyle}>
        <SectionTitle hint="Sparse Tanita scans — every 3–4 weeks">Body composition</SectionTitle>
        <LineChart
          series={[{ points: bfPoints, color: C.positive, strokeWidth: 2 }]}
          dots={bfPoints}
          emptyLabel="Add a Tanita scan below"
          formatY={(v) => v.toFixed(1)}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 100%" }}>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, marginBottom: 5 }}>
              Scan date
            </div>
            <input
              type="date"
              value={bfDate}
              onChange={(e) => setBfDate(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.surface2,
                color: C.text,
                fontFamily: FONTS.mono,
                fontSize: 13,
              }}
            />
          </label>
          <Field label="Body fat %" value={bfFat} onChange={setBfFat} placeholder="14.2" />
          <Field label="Muscle kg" value={bfMuscle} onChange={setBfMuscle} placeholder="—" />
          <Field label="Weight kg" value={bfWeight} onChange={setBfWeight} placeholder="—" />
        </div>
        <button
          type="button"
          disabled={savingBf || (!bfFat && !bfMuscle && !bfWeight)}
          onClick={() => void onSaveBf()}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            border: "none",
            background: C.accentSoft,
            color: C.accent,
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            opacity: savingBf ? 0.6 : 1,
          }}
        >
          Save scan
        </button>
        {comps.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {[...comps].reverse().slice(0, 4).map((c) => (
              <div
                key={c.date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  color: C.textMuted,
                }}
              >
                <span>{c.date}</span>
                <span>
                  {c.bodyFat != null ? `${c.bodyFat}%` : "—"}
                  {c.muscleMass != null ? ` · ${c.muscleMass}kg mm` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strength */}
      <div style={sectionStyle}>
        <SectionTitle hint="Top-set load · dot size tracks RPE">Strength</SectionTitle>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <select
            value={liftId}
            onChange={(e) => setLiftId(e.target.value)}
            style={{
              width: "100%",
              appearance: "none",
              padding: "11px 36px 11px 12px",
              borderRadius: 11,
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: C.text,
              fontFamily: FONTS.body,
              fontSize: 14,
            }}
          >
            {TRACKED_LIFTS.map((id) => (
              <option key={id} value={id}>
                {names[id] ?? id}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            color={C.textFaint}
            style={{ position: "absolute", right: 12, top: 13, pointerEvents: "none" }}
          />
        </div>
        <LineChart
          series={[{ points: liftChart, color: C.accent, strokeWidth: 2 }]}
          dots={liftChart}
          emptyLabel="Log this lift in a session first"
          formatY={(v) => `${Math.round(v)}`}
        />
        {liftPts.length > 0 && (
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Last {liftPts[liftPts.length - 1].weight}kg × {liftPts[liftPts.length - 1].reps}
            {liftPts[liftPts.length - 1].rpe != null
              ? ` @ RPE ${liftPts[liftPts.length - 1].rpe}`
              : ""}
          </div>
        )}
      </div>

      {/* Photos */}
      <div style={sectionStyle}>
        <SectionTitle hint="Local device only for now · drag slider to compare">
          Progress photos
        </SectionTitle>

        {photoA && photoB ? (
          <div
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              aspectRatio: "3/4",
              background: C.surface2,
              marginBottom: 10,
            }}
          >
            <img
              src={photoB.dataUrl}
              alt="compare B"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                clipPath: `inset(0 ${100 - slider}% 0 0)`,
              }}
            >
              <img
                src={photoA.dataUrl}
                alt="compare A"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${slider}%`,
                width: 2,
                background: C.accent,
                transform: "translateX(-1px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 8,
                bottom: 8,
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: "#fff",
                background: "rgba(0,0,0,.45)",
                padding: "3px 7px",
                borderRadius: 6,
              }}
            >
              {photoA.date}
            </div>
            <div
              style={{
                position: "absolute",
                right: 8,
                bottom: 8,
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: "#fff",
                background: "rgba(0,0,0,.45)",
                padding: "3px 7px",
                borderRadius: 6,
              }}
            >
              {photoB.date}
            </div>
          </div>
        ) : (
          <div
            style={{
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.textFaint,
              fontFamily: FONTS.body,
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            Add 2+ photos to compare
          </div>
        )}

        {photoA && photoB && (
          <input
            type="range"
            min={5}
            max={95}
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
            style={{ width: "100%", accentColor: C.accent, marginBottom: 12 }}
          />
        )}

        {photos.length >= 2 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <select
              value={compareA ?? ""}
              onChange={(e) => setCompareA(e.target.value)}
              style={selectMini}
            >
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  A · {p.date} · {p.pose}
                </option>
              ))}
            </select>
            <select
              value={compareB ?? ""}
              onChange={(e) => setCompareB(e.target.value)}
              style={selectMini}
            >
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  B · {p.date} · {p.pose}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {(["front", "side", "back"] as PhotoPose[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPose(p)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 9,
                border: `1px solid ${pose === p ? C.accent : C.border}`,
                background: pose === p ? C.accentSoft : C.surface2,
                color: pose === p ? C.accent : C.textMuted,
                fontFamily: FONTS.body,
                fontSize: 12,
                textTransform: "capitalize",
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onAddPhoto(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: C.surface2,
            color: C.text,
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <Camera size={16} color={C.accent} />
          Add photo
        </button>

        {photos.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginTop: 12,
            }}
          >
            {photos.slice(0, 9).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (window.confirm("Delete this photo?")) {
                    void deletePhoto(p.id).then(() => reload());
                  }
                }}
                style={{
                  padding: 0,
                  border: "none",
                  borderRadius: 10,
                  overflow: "hidden",
                  aspectRatio: "3/4",
                  cursor: "pointer",
                  background: C.surface2,
                }}
              >
                <img
                  src={p.dataUrl}
                  alt={p.date}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PR board */}
      <div style={sectionStyle}>
        <SectionTitle hint="Best weight / e1RM from logged sets">All-time PRs</SectionTitle>
        {prs.length === 0 ? (
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textFaint }}>
            Hit a PR in training — it shows up here.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {prs.slice(0, 12).map((pr) => (
              <div
                key={pr.exerciseId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: C.surface2,
                }}
              >
                <Award size={16} color={C.accent} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: FONTS.display,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: C.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {names[pr.exerciseId] ?? pr.exerciseId}
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint, marginTop: 2 }}>
                    last {pr.last.date}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 15, color: C.positive }}>
                    {pr.bestWeight}
                    <span style={{ fontSize: 10, color: C.textMuted }}> kg</span>
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.textFaint }}>
                    e1RM {pr.bestE1rm.toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const selectMini: React.CSSProperties = {
  flex: 1,
  padding: "8px 8px",
  borderRadius: 9,
  border: `1px solid ${C.border}`,
  background: C.surface2,
  color: C.text,
  fontFamily: FONTS.mono,
  fontSize: 11,
};
