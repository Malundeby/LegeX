-- Applied to the Legeassistent project 2026-11-25.

-- rls_auto_enable is an event trigger function; nobody needs to call it via the API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Shared Takstquiz mountain race (app/utils/quizMountain.ts). Four fixed players,
-- usable without login, so anon may read and update progress, but not add or delete rows.
create table if not exists public.quiz_mountain_players (
  player text primary key check (player in ('Anke', 'Jo', 'Anette', 'Valborg')),
  progress integer not null default 0 check (progress between 0 and 10),
  total_wins integer not null default 0 check (total_wins >= 0),
  updated_at timestamptz not null default now()
);

insert into public.quiz_mountain_players (player)
values ('Anke'), ('Jo'), ('Anette'), ('Valborg')
on conflict (player) do nothing;

alter table public.quiz_mountain_players enable row level security;

grant select on public.quiz_mountain_players to anon, authenticated;
grant update (progress, total_wins, updated_at) on public.quiz_mountain_players to anon, authenticated;
grant select, insert, update, delete on public.quiz_mountain_players to service_role;

drop policy if exists "quiz_mountain_read" on public.quiz_mountain_players;
create policy "quiz_mountain_read"
  on public.quiz_mountain_players for select to anon, authenticated
  using (true);

drop policy if exists "quiz_mountain_update" on public.quiz_mountain_players;
create policy "quiz_mountain_update"
  on public.quiz_mountain_players for update to anon, authenticated
  using (true)
  with check (true);
