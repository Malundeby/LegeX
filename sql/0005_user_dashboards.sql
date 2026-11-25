-- Personal link page (Lenker) for logged-in users.
-- One row per user with the whole widget layout as JSON. Anonymous visitors
-- keep using localStorage and never touch this table.

begin;

create table if not exists public.user_dashboards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  widgets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_dashboards enable row level security;

grant select, insert, update on public.user_dashboards to authenticated;
grant select, insert, update, delete on public.user_dashboards to service_role;

drop policy if exists "user_dashboards_own_select" on public.user_dashboards;
create policy "user_dashboards_own_select"
  on public.user_dashboards for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_dashboards_own_insert" on public.user_dashboards;
create policy "user_dashboards_own_insert"
  on public.user_dashboards for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_dashboards_own_update" on public.user_dashboards;
create policy "user_dashboards_own_update"
  on public.user_dashboards for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
