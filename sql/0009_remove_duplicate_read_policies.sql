-- Two read policies were created outside these files and duplicate the ones
-- from 0001. They allow exactly the same rows, so removing them changes nothing
-- for visitors; it only leaves one policy per table to keep track of.
drop policy if exists "public can read categories" on public.content_categories;
drop policy if exists "public can read published content" on public.content_items;
