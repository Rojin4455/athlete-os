-- Phase C — editable weekly/monthly goals. Run after schema.sql (+ phase-b optional).

create table if not exists public.plan_goals (
  user_id     uuid not null references auth.users (id) on delete cascade,
  period_key  text not null, -- e.g. week:2026-07-28 or month:2026-07
  kind        text not null check (kind in ('week', 'month')),
  items       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, period_key)
);

alter table public.plan_goals enable row level security;

drop policy if exists "plan_goals_own" on public.plan_goals;
create policy "plan_goals_own" on public.plan_goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.plan_goals to authenticated;
