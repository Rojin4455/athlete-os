import { useCallback, useEffect, useState } from "react";
import { Check, Circle } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import { ReadinessRing } from "./ReadinessRing";
import { computeReadiness, type ReadinessResult } from "../lib/readiness";
import { db, type DailyLog } from "../db";
import { listMilestoneProgress, setMilestoneStatus } from "../db/milestones";
import {
  buildMonthReview,
  buildWeekReview,
  consistencyStats,
  type PeriodReview,
} from "../db/reviews";
import { todayKey } from "../lib/dates";

interface Props {
  week: number;
  phase: string;
  programStartDate: string;
  daily: DailyLog;
  onResetTrainingData?: () => Promise<void>;
}

const section: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 16,
  padding: "16px 16px 14px",
  marginBottom: 14,
};

function Title({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 600, color: C.text }}>
        {children}
      </div>
      {hint && (
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textFaint, marginTop: 3, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: PeriodReview }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, background: C.surface2, marginBottom: 8 }}>
      <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 600, color: C.text }}>
        {review.headline}
      </div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint, marginTop: 4 }}>
        {review.sessionsCompleted} sessions · {review.volumeKg.toLocaleString()} kg
        {review.prs > 0 ? ` · ${review.prs} PRs` : ""}
        {review.avgReadiness != null ? ` · R${review.avgReadiness}` : ""}
      </div>
      <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
        {review.bullets.map((b, i) => (
          <li
            key={i}
            style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, lineHeight: 1.45, marginBottom: 6 }}
          >
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function YouScreen({ week, phase, programStartDate, daily, onResetTrainingData }: Props) {
  const phaseNum = (week <= 4 ? 1 : week <= 8 ? 2 : 3) as 1 | 2 | 3;
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [weekReview, setWeekReview] = useState<PeriodReview | null>(null);
  const [monthReview, setMonthReview] = useState<PeriodReview | null>(null);
  const [consistency, setConsistency] = useState({ current: 0, best: 0, loggedDays: 0 });
  const [milestones, setMilestones] = useState<
    Awaited<ReturnType<typeof listMilestoneProgress>>
  >([]);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const recent: { date: string; restingHr: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const row = await db.dailyLogs.get(key);
      recent.push({ date: key, restingHr: row?.restingHr ?? null });
    }
    setReadiness(computeReadiness(daily, recent));
    setWeekReview(await buildWeekReview());
    setMonthReview(await buildMonthReview());
    setConsistency(await consistencyStats());
    setMilestones(await listMilestoneProgress(phaseNum));
  }, [daily, phaseNum]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleMilestone = async (id: string, status: string) => {
    if (status === "locked") return;
    const next = status === "done" ? "active" : "done";
    await setMilestoneStatus(id, next);
    await reload();
  };

  const handleReset = async () => {
    if (!onResetTrainingData) return;
    const ok = window.confirm(
      "Delete all logged training data (sessions, PRs, progress, photos, goals, drafts)?\n\nWorkout templates stay. Week 1 will start on the coming Monday.\n\nThis cannot be undone.",
    );
    if (!ok) return;
    setResetting(true);
    setResetMsg(null);
    try {
      await onResetTrainingData();
      setResetMsg("Cleared. Reloading…");
      await reload();
    } catch (e) {
      setResetMsg(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ padding: "24px 18px 8px", animation: "fadeUp .35s ease" }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, letterSpacing: 1.2, marginBottom: 6 }}>
        YOU
      </div>
      <div style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        Rojin
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        Week {week} · {phase} · block from {programStartDate}
      </div>

      {/* Profile strip */}
      <div style={section}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textFaint }}>PROFILE</div>
        <div style={{ fontFamily: FONTS.display, fontSize: 15, color: C.text, marginTop: 6 }}>
          175.5 cm · start 68 kg · 14.2% BF
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.4 }}>
          Recomp focus · primary limiter = aerobic endurance · hypertrophy secondary
        </div>
      </div>

      {/* Readiness breakdown */}
      <div style={section}>
        <Title hint="Sleep + resting HR trend + check-in — one glanceable score">
          Readiness
        </Title>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {readiness && <ReadinessRing score={readiness.score} size={100} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 600, color: C.text }}>
              {readiness?.label ?? "—"}
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12.5, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>
              {readiness?.tip}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              {[
                ["Feel", readiness?.parts.subjective],
                ["Sleep", readiness?.parts.sleep],
                ["HR", readiness?.parts.hrTrend],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint }}>
                  {k} {v != null ? v : "—"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calm consistency — not guilt streak */}
      <div style={section}>
        <Title hint="Current + best days with any log. Broken streaks stay calm.">
          Consistency
        </Title>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: C.surface2, borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint }}>CURRENT</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 22, color: C.text, marginTop: 4 }}>
              {consistency.current}
            </div>
          </div>
          <div style={{ flex: 1, background: C.surface2, borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint }}>BEST</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 22, color: C.positive, marginTop: 4 }}>
              {consistency.best}
            </div>
          </div>
          <div style={{ flex: 1, background: C.surface2, borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint }}>DAYS</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 22, color: C.text, marginTop: 4 }}>
              {consistency.loggedDays}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly review */}
      <div style={section}>
        <Title hint="Auto from this week’s logs — ~30 seconds to read">Weekly review</Title>
        {weekReview ? <ReviewCard review={weekReview} /> : null}
      </div>

      {/* Monthly review */}
      <div style={section}>
        <Title hint="Ties to Tanita cadence + training density">Monthly review</Title>
        {monthReview ? <ReviewCard review={monthReview} /> : null}
      </div>

      {/* Milestones */}
      <div style={section}>
        <Title hint="Real roadmap markers. Tap to mark done — no points, no badges for opening the app.">
          Milestones
        </Title>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {milestones.map((m) => {
            const done = m.status === "done";
            const locked = m.status === "locked";
            return (
              <button
                key={m.milestoneId}
                type="button"
                disabled={locked}
                onClick={() => void toggleMilestone(m.milestoneId, m.status)}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  textAlign: "left",
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: `1px solid ${done ? "rgba(79,209,174,0.35)" : C.borderSoft}`,
                  background: done ? C.positiveSoft : C.surface2,
                  cursor: locked ? "default" : "pointer",
                  opacity: locked ? 0.55 : 1,
                }}
              >
                <div style={{ marginTop: 2 }}>
                  {done ? (
                    <Check size={16} color={C.positive} />
                  ) : (
                    <Circle size={16} color={locked ? C.textFaint : C.accent} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: C.text }}>
                    {m.title}
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted, marginTop: 3, lineHeight: 1.4 }}>
                    {m.detail}
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.textFaint, marginTop: 6 }}>
                    Phase {m.phase}
                    {locked ? " · unlocks later" : done ? " · done" : " · tap to complete"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Danger zone */}
      <div style={section}>
        <Title hint="Deletes logs, PRs, photos, goals, drafts. Keeps workout templates in the app code.">
          Reset training data
        </Title>
        <p style={{ fontFamily: FONTS.body, fontSize: 12.5, color: C.textMuted, lineHeight: 1.45, margin: "0 0 12px" }}>
          Clears test/logged data on this device
          {onResetTrainingData ? " and cloud (if signed in)" : ""}. Sets Week 1 start to the coming
          Monday. Does not delete your login or the program itself.
        </p>
        {resetMsg && (
          <p style={{ fontFamily: FONTS.body, fontSize: 12.5, color: C.positive, marginBottom: 10 }}>
            {resetMsg}
          </p>
        )}
        <button
          type="button"
          disabled={resetting || !onResetTrainingData}
          onClick={() => void handleReset()}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: 12,
            border: `1px solid ${C.warning}`,
            background: C.warningSoft,
            color: C.warning,
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: 14,
            cursor: resetting ? "wait" : "pointer",
            opacity: resetting ? 0.7 : 1,
          }}
        >
          {resetting ? "Resetting…" : "Reset all logged data"}
        </button>
      </div>
    </div>
  );
}
