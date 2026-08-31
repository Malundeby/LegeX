-- Run once, manually, in the Supabase SQL Editor.
-- Grants public read access to published content for the anon/authenticated
-- role (used by the existing NEXT_PUBLIC_SUPABASE_ANON_KEY client) and
-- enables RLS so only published, non-archived rows are ever visible to it.
--
-- content_events is intentionally left with NO grants/policies for
-- anon/authenticated: it is written exclusively via the service-role key
-- from app/api/track/route.ts, never directly from the client.

begin;

grant select on public.content_items to anon, authenticated;
grant select on public.content_categories to anon, authenticated;

-- service_role bypasses RLS, but table-level GRANTs are still required
-- separately in Postgres. Without these, /api/track and the /admin route
-- handlers fail with "permission denied" even though they use the
-- service-role key.
grant select, insert, update, delete on public.content_items to service_role;
grant select, insert, update, delete on public.content_categories to service_role;
grant select, insert, update, delete on public.content_events to service_role;

alter table public.content_items enable row level security;
alter table public.content_categories enable row level security;

drop policy if exists "content_items_public_read" on public.content_items;
create policy "content_items_public_read"
  on public.content_items
  for select
  to anon, authenticated
  using (published_at is not null and archived_at is null);

drop policy if exists "content_categories_public_read" on public.content_categories;
create policy "content_categories_public_read"
  on public.content_categories
  for select
  to anon, authenticated
  using (true);

commit;
