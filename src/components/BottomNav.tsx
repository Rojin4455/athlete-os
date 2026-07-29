import { Home, Dumbbell, LineChart, CalendarDays, User } from "lucide-react";
import { C, FONTS } from "../lib/tokens";

export type NavKey = "today" | "train" | "progress" | "plan" | "you";

interface Props {
  active: NavKey;
  onChange: (key: NavKey) => void;
  hidden?: boolean;
}

const items: { key: NavKey; icon: typeof Home; label: string }[] = [
  { key: "today", icon: Home, label: "Today" },
  { key: "train", icon: Dumbbell, label: "Train" },
  { key: "progress", icon: LineChart, label: "Progress" },
  { key: "plan", icon: CalendarDays, label: "Plan" },
  { key: "you", icon: User, label: "You" },
];

export function BottomNav({ active, onChange, hidden }: Props) {
  if (hidden) return null;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 74,
        background: "rgba(18,22,28,0.92)",
        backdropFilter: "blur(14px)",
        borderTop: `1px solid ${C.borderSoft}`,
        display: "flex",
        maxWidth: 430,
        margin: "0 auto",
        zIndex: 40,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map(({ key, icon: Icon, label }) => {
        const on = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: on ? 1 : 0.4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <Icon size={19} color={on ? C.accent : C.textMuted} />
            <span style={{ fontFamily: FONTS.body, fontSize: 9.5, color: on ? C.accent : C.textMuted }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
