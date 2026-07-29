import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  clearAuthHashFromUrl,
  getSupabase,
  isSupabaseConfigured,
  urlLooksLikeAuthCallback,
} from "../lib/supabase";
import { C, FONTS } from "../lib/tokens";
import { startSyncLoop } from "../sync";

/**
 * Email/password gate + password-recovery handler.
 * Session persists in localStorage and auto-refreshes until expired / signed out.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(configured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "recovery">("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    if (!supabase) {
      setBooting(false);
      return;
    }

    let alive = true;

    // If we landed on a recovery hash (even on wrong port user may paste URL), prefer recovery UI
    if (urlLooksLikeAuthCallback() && /type=recovery/i.test(window.location.hash + window.location.search)) {
      setMode("recovery");
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setBooting(false);
      if (data.session && mode !== "recovery" && !/type=recovery/i.test(window.location.hash)) {
        startSyncLoop();
        clearAuthHashFromUrl();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      const ev = event as string;
      if (ev === "PASSWORD_RECOVERY") {
        setMode("recovery");
        setSession(next);
        setBooting(false);
        setInfo("Choose a new password for your account.");
        return;
      }
      if (ev === "SIGNED_OUT") {
        setSession(null);
        return;
      }
      if (next) {
        setSession(next);
        // Don't enter the app until recovery password is saved
        const recovering =
          /type=recovery/i.test(window.location.hash + window.location.search);
        if (!recovering) {
          startSyncLoop();
          clearAuthHashFromUrl();
          setMode("signin");
        } else {
          setMode("recovery");
        }
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once
  }, [configured]);

  if (!configured) return <>{children}</>;
  if (booting) {
    return (
      <Shell>
        <p style={{ color: C.textMuted, fontFamily: FONTS.body, fontSize: 14 }}>Loading…</p>
      </Shell>
    );
  }
  // Normal app only when signed in and not mid-recovery
  if (session && mode !== "recovery") return <>{children}</>;

  const inputStyle: React.CSSProperties = {
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
  };

  const onSetNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = getSupabase();
    if (!supabase) {
      setBusy(false);
      return;
    }
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    clearAuthHashFromUrl();
    setMode("signin");
    setInfo("Password updated. You’re signed in.");
    setNewPassword("");
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      setSession(data.session);
      startSyncLoop();
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const supabase = getSupabase();
    if (!supabase) {
      setBusy(false);
      return;
    }

    const mail = email.trim();
    const pass = password;

    if (mode === "signup") {
      const { data: signedUp, error: signUpErr } = await supabase.auth.signUp({
        email: mail,
        password: pass,
      });
      if (signUpErr) {
        setBusy(false);
        if (/already registered|already been registered/i.test(signUpErr.message)) {
          setError("Account already exists — switch to Sign in and use that password.");
          setMode("signin");
          return;
        }
        setError(signUpErr.message);
        return;
      }
      if (signedUp.session) {
        setBusy(false);
        setSession(signedUp.session);
        startSyncLoop();
        return;
      }
    }

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: mail,
      password: pass,
    });

    setBusy(false);
    if (signInErr) {
      if (/invalid login credentials/i.test(signInErr.message)) {
        setError(
          "Wrong email or password. Reset it in Supabase Auth → Users, or use the recovery email (redirect URL must be this app).",
        );
        return;
      }
      if (/email not confirmed/i.test(signInErr.message)) {
        setError(
          "Email not confirmed. Auth → Providers → Email → turn off “Confirm email”, or confirm the user in Auth → Users.",
        );
        return;
      }
      setError(signInErr.message);
      return;
    }
    if (data.session) {
      setSession(data.session);
      startSyncLoop();
    }
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
          {mode === "recovery"
            ? "Set a new password to finish recovery."
            : "Sign in once — this device stays signed in."}
        </p>

        {mode === "recovery" ? (
          <form onSubmit={onSetNewPassword}>
            <label style={labelStyle}>New password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            {error && <p style={errStyle}>{error}</p>}
            {info && !error && <p style={infoStyle}>{info}</p>}
            <button type="submit" disabled={busy} style={btnStyle(busy)}>
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={onSubmit}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
              {error && <p style={errStyle}>{error}</p>}
              {info && !error && <p style={infoStyle}>{info}</p>}
              <button type="submit" disabled={busy} style={btnStyle(busy)}>
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfo(null);
                setMode((m) => (m === "signin" ? "signup" : "signin"));
              }}
              style={{
                marginTop: 14,
                width: "100%",
                border: "none",
                background: "transparent",
                color: C.textMuted,
                fontFamily: FONTS.body,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </Shell>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: FONTS.body,
  fontSize: 11,
  color: C.textFaint,
  marginBottom: 6,
};

const errStyle: React.CSSProperties = {
  fontFamily: FONTS.body,
  fontSize: 12.5,
  color: C.warning,
  marginBottom: 10,
};

const infoStyle: React.CSSProperties = {
  fontFamily: FONTS.body,
  fontSize: 12.5,
  color: C.positive,
  marginBottom: 10,
};

function btnStyle(busy: boolean): React.CSSProperties {
  return {
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
  };
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
