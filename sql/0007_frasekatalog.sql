-- Frasekatalog (app/components/fraser). Run once in the Supabase SQL Editor.
--
-- Categories form a tree of any depth (parent_id), so the catalog can use two
-- levels now and three or more later without schema changes. Phrases can hang
-- on any category. sort_order is null until the admin reorders; null sorts
-- alphabetically after any explicitly ordered rows.
--
-- Everyone (also anonymous visitors) may READ categories and phrases.
-- All writes to the shared catalog go through /api/fraser/admin with the
-- service-role key after requireAdmin(). Suggestions are inserted only via
-- /api/fraser/forslag (service role), never directly from the client.
-- Logged-in users own their personal phrases and favorites through RLS.

begin;

create table if not exists public.phrase_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.phrase_categories (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  sort_order integer,
  created_at timestamptz not null default now()
);
create index if not exists phrase_categories_parent_idx on public.phrase_categories (parent_id);

create table if not exists public.phrases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.phrase_categories (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 8000),
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists phrases_category_idx on public.phrases (category_id);

create table if not exists public.phrase_suggestions (
  id uuid primary key default gen_random_uuid(),
  phrase_id uuid references public.phrases (id) on delete set null,
  category_id uuid references public.phrase_categories (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 8000),
  comment text check (comment is null or char_length(comment) <= 2000),
  status text not null default 'ny' check (status in ('ny', 'godkjent', 'avvist')),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists phrase_suggestions_status_idx on public.phrase_suggestions (status, created_at desc);

create table if not exists public.user_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_phrases_user_idx on public.user_phrases (user_id);

create table if not exists public.user_phrase_favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  phrase_id uuid not null references public.phrases (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, phrase_id)
);

alter table public.phrase_categories enable row level security;
alter table public.phrases enable row level security;
alter table public.phrase_suggestions enable row level security;
alter table public.user_phrases enable row level security;
alter table public.user_phrase_favorites enable row level security;

-- Shared catalog: public read, writes only via service role.
grant select on public.phrase_categories to anon, authenticated;
grant select on public.phrases to anon, authenticated;
grant select, insert, update, delete on public.phrase_categories to service_role;
grant select, insert, update, delete on public.phrases to service_role;

drop policy if exists "phrase_categories_public_read" on public.phrase_categories;
create policy "phrase_categories_public_read"
  on public.phrase_categories for select to anon, authenticated using (true);

drop policy if exists "phrases_public_read" on public.phrases;
create policy "phrases_public_read"
  on public.phrases for select to anon, authenticated using (true);

-- Suggestions: service role only (no anon/authenticated grants).
grant select, insert, update, delete on public.phrase_suggestions to service_role;

-- Personal phrases and favorites: own rows only.
grant select, insert, update, delete on public.user_phrases to authenticated;
grant select, insert, update, delete on public.user_phrases to service_role;
grant select, insert, delete on public.user_phrase_favorites to authenticated;
grant select, insert, update, delete on public.user_phrase_favorites to service_role;

drop policy if exists "user_phrases_own" on public.user_phrases;
create policy "user_phrases_own"
  on public.user_phrases for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_phrase_favorites_own" on public.user_phrase_favorites;
create policy "user_phrase_favorites_own"
  on public.user_phrase_favorites for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
