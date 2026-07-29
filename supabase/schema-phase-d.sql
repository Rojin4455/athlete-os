-- Phase D — milestone completion. Run after earlier schema files.

create table if not exists public.milestones (
  user_id     uuid not null references auth.users (id) on delete cascade,
  milestone_id text not null,
  status      text not null check (status in ('locked', 'active', 'done')),
  note        text,
  done_at     timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, milestone_id)
);

alter table public.milestones enable row level security;

drop policy if exists "milestones_own" on public.milestones;
create policy "milestones_own" on public.milestones
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.milestones to authenticated;

-- Weekly/monthly reviews are regenerated locally from logs; no cloud table required for Phase D.
