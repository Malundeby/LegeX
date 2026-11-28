-- Hand-drawn signature, one per user, drawn on the profile page and placed on
-- PDF forms. Stored as pen strokes (JSON), not as an image. Only the owner can
-- read or change it. Kept out of user_metadata because that travels in the
-- login cookie with every request.

begin;

create table if not exists public.user_signatures (
  user_id uuid primary key references auth.users (id) on delete cascade,
  drawing jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_signatures_drawing_size check (octet_length(drawing::text) <= 60000)
);

alter table public.user_signatures enable row level security;

revoke all on public.user_signatures from anon;
grant select, insert, update, delete on public.user_signatures to authenticated;
grant select, insert, update, delete on public.user_signatures to service_role;

drop policy if exists "user_signatures_own" on public.user_signatures;
create policy "user_signatures_own"
  on public.user_signatures for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
