import { C, FONTS } from "../lib/tokens";
import type { NavKey } from "./BottomNav";
import { WEEK_TEMPLATE, SESSIONS } from "../data/program";

interface Props {
  tab: NavKey;
  week: number;
  phase: string;
  programStartDate: string;
}

export function PlaceholderTab({ tab, week, phase, programStartDate }: Props) {
  const titles: Record<NavKey, string> = {
    today: "Today",
    train: "Train",
    progress: "Progress",
    plan: "Plan",
    you: "You",
  };

  return (
    <div style={{ padding: "28px 20px", animation: "fadeUp .35s ease" }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.accent, letterSpacing: 1, marginBottom: 8 }}>
        PHASE {tab === "plan" ? "C" : tab === "progress" ? "B" : "A"} · COMING NEXT
      </div>
      <div style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 600, color: C.text, marginBottom: 8 }}>
        {titles[tab]}
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 14, color: C.textMuted, lineHeight: 1.55, marginBottom: 20 }}>
        {tab === "train" &&
          "Workout library, exercise database, calisthenics tracker, and mobility routines land after Phase A logging is solid."}
        {tab === "progress" &&
          "Weight, body fat, strength charts, and photo compare — Phase B, once you have real logged data."}
        {tab === "plan" &&
          "Full 12-week phase map, weekly goals, and nutrition targets — Phase C."}
        {tab === "you" &&
          "Profile, coach notes, settings, and program archive — later phases."}
      </div>

      {tab === "train" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {WEEK_TEMPLATE.filter((d) => d.sessionId !== "rest").map((d) => {
            const s = SESSIONS[d.sessionId];
            return (
              <div
                key={d.sessionId}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.borderSoft}`,
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 600, color: C.text }}>
                  {s.name}
                </div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                  {d.d} · {s.focus}
                  {s.exercises ? ` · ${s.exercises.length} movements` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "plan" && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.textFaint, marginBottom: 8 }}>
            CURRENT BLOCK
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 600, color: C.text }}>
            Week {week} · {phase}
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginTop: 6 }}>
            Started {programStartDate} · 12-week hybrid athlete block
          </div>
        </div>
      )}

      {tab === "you" && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 600, color: C.text }}>
            Rojin
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.textMuted, marginTop: 8 }}>
            175.5 cm · start 68 kg · 14.2% BF
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: C.textFaint, marginTop: 10 }}>
            Local-first · data stays on this device (cloud sync later)
          </div>
        </div>
      )}
    </div>
  );
}
