import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { C, FONTS } from "../lib/tokens";
import { startSyncLoop } from "../sync";

/**
 * Minimal magic-link gate. When Supabase env is missing, renders children
 * immediately (local-only mode). Does not alter Today/workout screens.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(configured);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    if (!supabase) {
      setBooting(false);
      return;
    }

    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setBooting(false);
      if (data.session) startSyncLoop();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) startSyncLoop();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  if (!configured) return <>{children}</>;
  if (booting) {
    return (
      <Shell>
        <p style={{ color: C.textMuted, fontFamily: FONTS.body, fontSize: 14 }}>Loading…</p>
      </Shell>
    );
  }
  if (session) return <>{children}</>;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = getSupabase();
    if (!supabase) {
      setBusy(false);
      return;
    }
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <Shell>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 22,
            fontWeight: 600,
            color: C.text,
            marginBottom: 6,
          }}
        >
          Hybrid Athlete
        </div>
        <p style={{ fontFamily: FONTS.body, fontSize: 13.5, color: C.textMuted, marginBottom: 22, lineHeight: 1.45 }}>
          Sign in with a magic link to sync this device. Workout logging still works offline after
          you&apos;re signed in once.
        </p>

        {sent ? (
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: C.positive, lineHeight: 1.45 }}>
            Check your email for the link. Leave this tab open — you&apos;ll land back here after
            tap.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <label
              style={{
                display: "block",
                fontFamily: FONTS.body,
                fontSize: 11,
                color: C.textFaint,
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                background: C.surface2,
                color: C.text,
                fontFamily: FONTS.body,
                fontSize: 15,
                marginBottom: 12,
                outline: "none",
              }}
            />
            {error && (
              <p style={{ fontFamily: FONTS.body, fontSize: 12.5, color: C.warning, marginBottom: 10 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: 12,
                border: "none",
                background: C.accent,
                color: "#0B0E12",
                fontFamily: FONTS.body,
                fontWeight: 600,
                fontSize: 14.5,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}
