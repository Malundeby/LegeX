-- public.profiles was left over from an earlier version. The app keeps name,
-- signature, phone and display preferences in Supabase Auth user_metadata, and
-- nothing (code, functions, triggers, views) reads this table. Dropping it means
-- personal details are no longer kept in two places.
drop table if exists public.profiles;
