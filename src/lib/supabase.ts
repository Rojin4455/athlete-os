import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../sync/types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when both Vite env vars are present. Sync is a no-op otherwise. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient<Database>(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Needed for password-recovery links (#access_token&type=recovery)
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        storageKey: "hybrid-athlete-auth",
      },
    });
  }
  return client;
}

/** True when the current URL is a Supabase recovery / invite hash callback. */
export function urlLooksLikeAuthCallback(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.slice(1);
  const search = window.location.search.slice(1);
  const blob = `${hash}&${search}`;
  return (
    blob.includes("type=recovery") ||
    blob.includes("type=signup") ||
    blob.includes("type=invite") ||
    blob.includes("access_token=")
  );
}

export function clearAuthHashFromUrl(): void {
  if (typeof window === "undefined") return;
  if (!window.location.hash && !window.location.search.includes("code=")) return;
  const clean = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, clean);
}
