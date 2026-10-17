-- 古問 LORE — rate limits for reports and analytics events
-- Run after 0003_admin_analytics.sql.
--
-- Already limited elsewhere: comments (10 per 10 minutes, 0002_rls.sql),
-- AI Companion (AI_DAILY_LIMIT per day, in the API route), reflections
-- (one per question), reports (one per post per person), sign-in emails
-- (Supabase Auth's own limits).

create index if not exists events_user_recent on public.events (user_id, created_at) where user_id is not null;
create index if not exists events_anon_recent on public.events (anon_id, created_at) where anon_id is not null;
create index if not exists reports_reporter_recent on public.reports (reporter_id, created_at);

-- Reports: at most 20 per person per hour.
create or replace function public.reports_rate_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.reports r
    where r.reporter_id = new.reporter_id and r.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Too many reports — please wait a while';
  end if;
  return new;
end;
$$;

create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.reports_rate_limit();

-- Events: at most 120 per person (or per signed-out browser) per hour.
-- Extra events are dropped silently so spamming can't inflate the analytics,
-- and a real reader never sees an error.
create or replace function public.events_rate_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Inside SECURITY DEFINER, current_user is this function's owner; the
  -- caller's role (as set by Supabase's API) is in the `role` setting.
  if coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated') then
    return new; -- service role / SQL editor
  end if;
  if new.user_id is null and new.anon_id is null then
    return null; -- nothing to attribute it to
  end if;
  if (
    select count(*) from public.events e
    where e.created_at > now() - interval '1 hour'
      and ((new.user_id is not null and e.user_id = new.user_id)
        or (new.user_id is null and e.anon_id = new.anon_id))
  ) >= 120 then
    return null;
  end if;
  return new;
end;
$$;

create trigger events_rate_limit
  before insert on public.events
  for each row execute function public.events_rate_limit();
