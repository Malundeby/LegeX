-- Visitor statistics are kept for 13 months, then deleted. The admin pages
-- look back at most 12 months, so they are unaffected. Runs every night at
-- 03:17 UTC with pg_cron.
create extension if not exists pg_cron;

create or replace function public.delete_old_content_events()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.content_events where created_at < now() - interval '13 months';
$$;

revoke all on function public.delete_old_content_events() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'delete-old-content-events';
select cron.schedule('delete-old-content-events', '17 3 * * *', 'select public.delete_old_content_events()');
