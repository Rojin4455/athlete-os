-- Session workout overrides (editable gym templates). Run after earlier schemas.

create table if not exists public.session_overrides (
  user_id     uuid not null references auth.users (id) on delete cascade,
  session_id  text not null,
  exercises   jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, session_id)
);

alter table public.session_overrides enable row level security;

drop policy if exists "session_overrides_own" on public.session_overrides;
create policy "session_overrides_own" on public.session_overrides
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.session_overrides to authenticated;
