import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { C, FONTS } from "../lib/tokens";
import { SESSIONS, type StrengthExercise } from "../data/program";
import { clearSessionOverride, saveSessionOverride } from "../db/overrides";

interface Props {
  sessionId: string;
  initial: StrengthExercise[];
  onSaved: () => void;
  onClose: () => void;
}

function blankExercise(): StrengthExercise {
  return {
    id: `custom-${crypto.randomUUID().slice(0, 8)}`,
    name: "New exercise",
    cue: "",
    sets: 3,
    repRange: "8–10",
    tempo: "2-0-1-0",
    rpeTarget: "7",
    restSec: 90,
  };
}

export function SessionEditor({ sessionId, initial, onSaved, onClose }: Props) {
  const [items, setItems] = useState<StrengthExercise[]>(() => initial.map((e) => ({ ...e })));
  const [busy, setBusy] = useState(false);
  const base = SESSIONS[sessionId];

  const update = (i: number, patch: Partial<StrengthExercise>) => {
    setItems((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));
  };

  const move = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveSessionOverride(sessionId, items);
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("Reset this session to the original program?")) return;
    setBusy(true);
    try {
      await clearSessionOverride(sessionId);
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "92vh",
          overflow: "auto",
          background: C.bg,
          borderRadius: "18px 18px 0 0",
          padding: "18px 16px 28px",
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 600, color: C.text }}>
            Edit · {base?.shortLabel ?? sessionId}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: C.textMuted, fontFamily: FONTS.body, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: C.textFaint, marginBottom: 14 }}>
          Changes apply to logging + Plan/Train. Syncs when online.
        </div>

        {items.map((ex, i) => (
          <div
            key={ex.id}
            style={{
              background: C.surface,
              border: `1px solid ${C.borderSoft}`,
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={() => move(i, -1)} style={iconBtn} aria-label="Move up">
                <ChevronUp size={14} />
              </button>
              <button type="button" onClick={() => move(i, 1)} style={iconBtn} aria-label="Move down">
                <ChevronDown size={14} />
              </button>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                style={{ ...iconBtn, color: C.warning }}
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <Field label="Name" value={ex.name} onChange={(v) => update(i, { name: v })} />
            <Field label="Cue" value={ex.cue} onChange={(v) => update(i, { cue: v })} />
            <div style={{ display: "flex", gap: 8 }}>
              <Field label="Sets" value={String(ex.sets)} onChange={(v) => update(i, { sets: Number(v) || 1 })} mono />
              <Field label="Reps" value={ex.repRange} onChange={(v) => update(i, { repRange: v })} mono />
              <Field label="RPE" value={ex.rpeTarget} onChange={(v) => update(i, { rpeTarget: v })} mono />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Field
                label="Rest sec"
                value={String(ex.restSec)}
                onChange={(v) => update(i, { restSec: Number(v) || 60 })}
                mono
              />
              <Field label="Tempo" value={ex.tempo} onChange={(v) => update(i, { tempo: v })} mono />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, blankExercise()])}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            border: `1px dashed ${C.border}`,
            background: C.surface2,
            color: C.text,
            fontFamily: FONTS.body,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            marginBottom: 10,
          }}
        >
          <Plus size={16} color={C.accent} />
          Add exercise
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void reset()}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: C.textMuted,
              fontFamily: FONTS.body,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            type="button"
            disabled={busy || items.length === 0}
            onClick={() => void save()}
            style={{
              flex: 2,
              padding: "13px 0",
              borderRadius: 12,
              border: "none",
              background: C.accent,
              color: "#0B0E12",
              fontFamily: FONTS.body,
              fontWeight: 600,
              cursor: "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <label style={{ flex: 1, display: "block", marginBottom: 8 }}>
      <div style={{ fontFamily: FONTS.body, fontSize: 10, color: C.textFaint, marginBottom: 4 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "9px 10px",
          borderRadius: 9,
          border: `1px solid ${C.border}`,
          background: C.surface2,
          color: C.text,
          fontFamily: mono ? FONTS.mono : FONTS.body,
          fontSize: 13,
          outline: "none",
        }}
      />
    </label>
  );
}

const iconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: `1px solid ${C.borderSoft}`,
  background: C.surface2,
  color: C.textMuted,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
