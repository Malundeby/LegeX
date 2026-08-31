-- Run once, manually, in the Supabase SQL Editor, AFTER 0001 and 0002.
-- Adds the description column that app/components/ToolHub.tsx's
-- ResourceCard rendering (Verktøy / Pasientinformasjon / Oversikter tabs)
-- requires and displays — discovered missing after the initial seed.

begin;

alter table public.content_items add column if not exists description text;

commit;
