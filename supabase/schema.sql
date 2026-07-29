-- Hybrid Athlete — Phase A cloud schema
-- Run once in the Supabase SQL editor.
-- Single-user, RLS: every row is scoped to auth.uid().

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- quick_logs  (water / sleep / weight / readiness / resting HR)
-- ---------------------------------------------------------------------------
create table if not exists public.quick_logs (
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  water       integer not null default 0,
  sleep       double precision,
  weight      double precision,
  readiness   text check (readiness is null or readiness in ('ready', 'okay', 'tired')),
  resting_hr  integer,
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);

-- ---------------------------------------------------------------------------
-- workout_sessions
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id            uuid primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          date not null,
  session_id    text not null,
  week          integer not null,
  started_at    bigint not null,
  finished_at   bigint,
  duration_sec  integer not null default 0,
  exercises     jsonb not null default '[]'::jsonb,
  extras        jsonb,
  total_volume  double precision not null default 0,
  sets_logged   integer not null default 0,
  prs_hit       integer not null default 0,
  completed     boolean not null default false,
  updated_at    timestamptz not null default now()
);

create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, date);

create index if not exists workout_sessions_user_session_idx
  on public.workout_sessions (user_id, session_id);

-- ---------------------------------------------------------------------------
-- exercise_history  (last set + PR tracking)
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_history (
  user_id      uuid not null references auth.users (id) on delete cascade,
  exercise_id  text not null,
  last         jsonb not null,
  best_weight  double precision not null default 0,
  best_e1rm    double precision not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- ---------------------------------------------------------------------------
-- week_status
-- ---------------------------------------------------------------------------
create table if not exists public.week_status (
  user_id     uuid not null references auth.users (id) on delete cascade,
  week_key    date not null,
  status      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, week_key)
);

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  program_start_date  date not null,
  units               text not null default 'metric',
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS — own-row pattern on every table
-- ---------------------------------------------------------------------------
alter table public.quick_logs enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_history enable row level security;
alter table public.week_status enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "quick_logs_own" on public.quick_logs;
create policy "quick_logs_own" on public.quick_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_sessions_own" on public.workout_sessions;
create policy "workout_sessions_own" on public.workout_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "exercise_history_own" on public.exercise_history;
create policy "exercise_history_own" on public.exercise_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "week_status_own" on public.week_status;
create policy "week_status_own" on public.week_status
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "app_settings_own" on public.app_settings;
create policy "app_settings_own" on public.app_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: allow authenticated role to use the tables (RLS still applies)
grant select, insert, update, delete on public.quick_logs to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.exercise_history to authenticated;
grant select, insert, update, delete on public.week_status to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
