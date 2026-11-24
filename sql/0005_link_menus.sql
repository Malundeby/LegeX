-- Lenker-fanen: standardmeny (styres av admin) og egen meny per innlogget bruker.
-- Applied to production 2026-11-24 via Supabase MCP. Safe to re-run.

begin;

-- Standardmenyen alle ser. Én rad med id = 'default'.
-- Skrives bare via /api/admin/default-links (service role).
create table if not exists public.link_defaults (
  id text primary key,
  widgets jsonb not null,
  updated_at timestamptz not null default now()
);

-- Brukerens egen meny. Én rad per bruker.
create table if not exists public.link_layouts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  widgets jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.link_defaults enable row level security;
alter table public.link_layouts enable row level security;

grant select on public.link_defaults to anon, authenticated;
grant select, insert, update, delete on public.link_layouts to authenticated;
grant select, insert, update, delete on public.link_defaults to service_role;
grant select, insert, update, delete on public.link_layouts to service_role;

drop policy if exists "link_defaults_public_read" on public.link_defaults;
create policy "link_defaults_public_read"
  on public.link_defaults for select
  to anon, authenticated
  using (true);

drop policy if exists "link_layouts_own_select" on public.link_layouts;
create policy "link_layouts_own_select"
  on public.link_layouts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "link_layouts_own_insert" on public.link_layouts;
create policy "link_layouts_own_insert"
  on public.link_layouts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "link_layouts_own_update" on public.link_layouts;
create policy "link_layouts_own_update"
  on public.link_layouts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "link_layouts_own_delete" on public.link_layouts;
create policy "link_layouts_own_delete"
  on public.link_layouts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
