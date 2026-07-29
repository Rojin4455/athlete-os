# Hybrid Athlete

Personal single-user PWA for the 12-week hybrid athlete program.

## Phase A (current)

- Today screen (readiness ring, session card, week strip, quick logs)
- Full workout logging for Upper A/B, Lower A/B, Zone 2, Football
- IndexedDB local-first storage (Dexie) with optional Supabase backup sync
- Installable PWA shell

## Phase B

- Progress tab: weight chart (raw + 7-day avg), body-comp / Tanita log, strength top-set charts, photo compare, PR board
- Run `supabase/schema-phase-b.sql` for `body_comp` cloud sync (photos stay local for now)

## Phase C

- Plan tab: 12-week phase map, this-week schedule, nutrition targets (train vs rest), editable weekly/monthly goals
- Run `supabase/schema-phase-c.sql` for `plan_goals` sync

## Phase D

- You tab: readiness breakdown, calm consistency, weekly/monthly auto reviews, roadmap milestones
- Today: soft readiness tip + morning resting HR quick log
- Run `supabase/schema-phase-d.sql` for `milestones` sync

## Train + overrides

- Plan: expand any day for full workout detail; edit strength templates
- Train library: sessions, exercise history, calisthenics, mobility, cardio protocols
- Workout editor: reorder / add / remove / tweak sets·reps·RPE; reset to program
- Run `supabase/schema-overrides.sql` for `session_overrides` sync

## Run

```bash
npm install
cp .env.example .env   # fill in Supabase URL + anon key (optional)
npm run dev
```

Open the local URL on your phone (same network) or desktop. Use the browser “Add to Home Screen” / Install prompt for the PWA.

Without `.env`, the app runs fully local/offline. With Supabase configured, a magic-link sign-in gate appears once; then an outbox flushes writes in the background.

## Supabase setup

1. Create a project, enable Email OTP (magic link) under Auth.
2. Run `supabase/schema.sql` in the SQL editor (tables + RLS own-row policies).
3. Copy Project URL + anon key into `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. Add your local/dev URL to Auth → Redirect URLs.

## Data / sync

- **Local source of truth:** IndexedDB via Dexie (`hybrid-athlete`). Workout UI only talks to Dexie.
- **Outbox:** every write also enqueues a row in the local `outbox` store.
- **Cloud:** when online + signed in, the sync loop upserts outbox payloads and pulls remote rows (latest `updated_at` wins).
- Program week comes from `programStartDate` in settings (defaults to the Monday of the week you first open the app = Week 1).
