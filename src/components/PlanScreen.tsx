import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import { mondayIndexOf, weekStartKey } from "../lib/dates";
import {
  PHASES,
  WEEK_TEMPLATE,
  NUTRITION,
  nutritionForDay,
  getZone2,
  getSprint,
  type SessionDef,
} from "../data/program";
import { getWeekStatus, getHistory, type ExerciseHistory } from "../db";
import {
  getOrCreateMonthGoals,
  getOrCreateWeekGoals,
  monthPeriodKey,
  saveGoalItems,
} from "../db/goals";
import {
  getEffectiveSession,
  getSessionOverride,
  isCustomized,
} from "../db/overrides";
import { SessionDetail } from "./SessionDetail";
import { SessionEditor } from "./SessionEditor";

interface Props {
  week: number;
  phase: string;
  programStartDate: string;
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

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 15, color: C.text }}>{value}</div>
      <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function GoalsEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            marginBottom: 8,
            padding: "10px 10px",
            borderRadius: 11,
            background: C.surface2,
          }}
        >
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            onBlur={() => onChange(items.map((x) => x.trim()).filter(Boolean))}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: C.text,
              fontFamily: FONTS.body,
              fontSize: 13,
              lineHeight: 1.4,
              outline: "none",
              resize: "none",
            }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 2,
              color: C.textFaint,
            }}
            aria-label="Remove goal"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input
          value={draft}
          placeholder="Add a goal…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: C.surface2,
            color: C.text,
            fontFamily: FONTS.body,
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            onChange([...items, draft.trim()]);
            setDraft("");
          }}
          style={{
            width: 42,
            borderRadius: 10,
            border: "none",
            background: C.accentSoft,
            color: C.accent,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function PlanScreen({ week, phase, programStartDate }: Props) {
  const todayIdx = mondayIndexOf();
  const [weekStatus, setWeekStatus] = useState<Record<number, "done" | "partial">>({});
  const [weekGoals, setWeekGoals] = useState<string[]>([]);
  const [monthGoals, setMonthGoals] = useState<string[]>([]);
  const [previewWeek, setPreviewWeek] = useState(week);
  const [expanded, setExpanded] = useState<number | null>(todayIdx);
  const [daySessions, setDaySessions] = useState<Record<string, SessionDef>>({});
  const [customFlags, setCustomFlags] = useState<Record<string, boolean>>({});
  const [histories, setHistories] = useState<Record<string, Record<string, ExerciseHistory>>>({});
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const nutrition = nutritionForDay(todayIdx === 6);
  const z2 = getZone2(previewWeek);
  const sprint = getSprint(previewWeek);

  const loadDays = useCallback(async () => {
    const map: Record<string, SessionDef> = {};
    const flags: Record<string, boolean> = {};
    const histMap: Record<string, Record<string, ExerciseHistory>> = {};
    for (const d of WEEK_TEMPLATE) {
      const eff = await getEffectiveSession(d.sessionId);
      const ov = await getSessionOverride(d.sessionId);
      map[d.sessionId] = eff;
      flags[d.sessionId] = isCustomized(d.sessionId, ov);
      const h: Record<string, ExerciseHistory> = {};
      for (const ex of eff.exercises ?? []) {
        const row = await getHistory(ex.id);
        if (row) h[ex.id] = row;
      }
      histMap[d.sessionId] = h;
    }
    setDaySessions(map);
    setCustomFlags(flags);
    setHistories(histMap);
  }, []);

  const persistWeek = useCallback(
    async (items: string[]) => {
      setWeekGoals(items);
      await saveGoalItems(`week:${weekStartKey()}`, "week", items);
    },
    [],
  );

  const persistMonth = useCallback(async (items: string[]) => {
    setMonthGoals(items);
    await saveGoalItems(monthPeriodKey(), "month", items);
  }, []);

  useEffect(() => {
    void (async () => {
      setWeekStatus(await getWeekStatus(weekStartKey()));
      const w = await getOrCreateWeekGoals(weekStartKey(), week);
      setWeekGoals(w.items);
      const m = await getOrCreateMonthGoals(monthPeriodKey(), week);
      setMonthGoals(m.items);
      await loadDays();
    })();
  }, [week, loadDays]);

  useEffect(() => {
    setPreviewWeek(week);
  }, [week]);

  const editing = editSessionId ? daySessions[editSessionId] : null;

  return (
    <div style={{ padding: "24px 18px 8px", animation: "fadeUp .35s ease" }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, letterSpacing: 1.2, marginBottom: 6 }}>
        PLAN
      </div>
      <div style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        What&apos;s next
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        Week {week} · {phase} · started {programStartDate}
      </div>

      {/* 12-week phase map */}
      <div style={section}>
        <Title hint="Tap a week chip to preview Zone 2 / sprint focus">12-week map</Title>
        {PHASES.map((p) => {
          const active = (p.weeks as readonly number[]).includes(week);
          return (
            <div
              key={p.id}
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 12,
                background: active ? C.accentSoft : C.surface2,
                border: `1px solid ${active ? "rgba(242,169,76,0.35)" : C.borderSoft}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: C.text }}>
                  Phase {p.id} · {p.name}
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint }}>
                  W{p.weeks[0]}–{p.weeks[p.weeks.length - 1]}
                </div>
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>
                {p.focus}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {p.weeks.map((w) => {
                  const isCurrent = w === week;
                  const isPreview = w === previewWeek;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setPreviewWeek(w)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        border: `1px solid ${isCurrent ? C.accent : isPreview ? C.border : C.borderSoft}`,
                        background: isCurrent ? C.accent : isPreview ? C.surface3 : C.surface,
                        color: isCurrent ? "#0B0E12" : C.text,
                        fontFamily: FONTS.mono,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div
          style={{
            marginTop: 4,
            padding: 12,
            borderRadius: 12,
            background: C.surface2,
          }}
        >
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.accent, marginBottom: 6 }}>
            WEEK {previewWeek} FOCUS
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.text, lineHeight: 1.45 }}>
            Zone 2: {z2.durationMin > 0 ? `${z2.durationMin} min` : "test"} · {z2.notes || z2.paceGuide}
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>
            Sprints:{" "}
            {sprint.sprintSec
              ? `${sprint.reps}×${sprint.sprintSec}s × ${sprint.sets} · ${sprint.recoverySec}s rest`
              : sprint.notes}
          </div>
        </div>
      </div>

      {/* This week */}
      <div style={section}>
        <Title hint="Tap a day to expand full workout · edit strength sessions inline">This week</Title>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {WEEK_TEMPLATE.map((d, i) => {
            const s = daySessions[d.sessionId];
            if (!s) return null;
            const done = weekStatus[i] === "done";
            const partial = weekStatus[i] === "partial";
            const isToday = i === todayIdx;
            const open = expanded === i;
            return (
              <div
                key={d.sessionId + i}
                style={{
                  borderRadius: 12,
                  background: isToday ? C.accentSoft : C.surface2,
                  border: `1px solid ${isToday ? "rgba(242,169,76,0.35)" : "transparent"}`,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 12px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: `1.5px solid ${done ? C.positive : C.border}`,
                      background: done ? C.positiveSoft : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {done ? (
                      <Check size={14} color={C.positive} />
                    ) : (
                      <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.textFaint }}>{d.d[0]}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: C.text }}>
                      {d.d} · {s.name}
                      {customFlags[d.sessionId] ? " · *" : ""}
                    </div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      {s.focus}
                      {s.estMinutes ? ` · ~${s.estMinutes}m` : ""}
                      {partial && !done ? " · partial" : ""}
                    </div>
                  </div>
                  {open ? <ChevronUp size={16} color={C.textFaint} /> : <ChevronDown size={16} color={C.textFaint} />}
                </button>
                {open && (
                  <div style={{ padding: "0 12px 12px" }}>
                    {s.kind === "strength" && (
                      <button
                        type="button"
                        onClick={() => setEditSessionId(s.id)}
                        style={{
                          width: "100%",
                          marginBottom: 10,
                          padding: "10px 0",
                          borderRadius: 10,
                          border: `1px solid ${C.border}`,
                          background: C.surface,
                          color: C.text,
                          fontFamily: FONTS.body,
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={14} />
                        Edit workout
                      </button>
                    )}
                    <SessionDetail
                      session={s}
                      week={week}
                      history={histories[d.sessionId]}
                      customized={customFlags[d.sessionId]}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {editing?.exercises && editSessionId && (
        <SessionEditor
          sessionId={editSessionId}
          initial={editing.exercises}
          onClose={() => setEditSessionId(null)}
          onSaved={() => void loadDays()}
        />
      )}

      {/* Nutrition */}
      <div style={section}>
        <Title hint={`${NUTRITION.strategy} · cycles with train vs rest`}>
          Nutrition · {nutrition.label}
        </Title>
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "14px 8px",
            borderRadius: 12,
            background: C.surface2,
            marginBottom: 10,
          }}
        >
          <Macro label="KCAL" value={`${nutrition.kcal.min}–${nutrition.kcal.max}`} />
          <Macro label="PRO" value={`${nutrition.proteinG.min}–${nutrition.proteinG.max}g`} />
          <Macro label="CHO" value={`${nutrition.carbsG.min}–${nutrition.carbsG.max}g`} />
          <Macro label="FAT" value={`${nutrition.fatG.min}–${nutrition.fatG.max}g`} />
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>
          {NUTRITION.notes}
        </div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.textFaint, marginTop: 8 }}>
          Rest Sunday → lower carbs ({NUTRITION.carbsRestG.min}–{NUTRITION.carbsRestG.max}g)
        </div>
      </div>

      {/* Goals */}
      <div style={section}>
        <Title hint="Seeded from the program — edit freely, syncs when online">Weekly goals</Title>
        <GoalsEditor items={weekGoals} onChange={(n) => void persistWeek(n)} />
      </div>

      <div style={section}>
        <Title hint="Phase-level aims for this calendar month">Monthly goals</Title>
        <GoalsEditor items={monthGoals} onChange={(n) => void persistMonth(n)} />
      </div>
    </div>
  );
}
