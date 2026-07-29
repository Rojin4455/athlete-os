import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { onOutboxEnqueued } from "../db";
import { syncNow, flushOutbox } from "./engine";

let started = false;
let timer: number | null = null;
let unsubOutbox: (() => void) | null = null;
let flushScheduled = false;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    void flushOutbox().catch((err) => console.warn("[sync]", err));
  });
}

async function tick() {
  try {
    await syncNow();
  } catch (err) {
    console.warn("[sync]", err);
  }
}

/** Start background outbox flush + pull. Safe to call multiple times. */
export function startSyncLoop(): void {
  if (started || !isSupabaseConfigured()) return;
  started = true;

  void tick();

  unsubOutbox = onOutboxEnqueued(scheduleFlush);

  window.addEventListener("online", () => {
    void tick();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void tick();
  });

  const supabase = getSupabase();
  supabase?.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
      void tick();
    }
  });

  // Periodic backup flush while the app is open
  timer = window.setInterval(() => {
    void tick();
  }, 30_000);
}

export function stopSyncLoop(): void {
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
  unsubOutbox?.();
  unsubOutbox = null;
  started = false;
}

export { syncNow, flushOutbox, pullRemote } from "./engine";
