-- Phase B additions — run in Supabase SQL editor after schema.sql

create table if not exists public.body_comp (
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          date not null,
  body_fat      double precision,
  muscle_mass   double precision,
  weight        double precision,
  notes         text,
  updated_at    timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.body_comp enable row level security;

drop policy if exists "body_comp_own" on public.body_comp;
create policy "body_comp_own" on public.body_comp
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.body_comp to authenticated;

-- Progress photos stay local in Dexie for Phase B (blobs). Cloud Storage sync = later.
