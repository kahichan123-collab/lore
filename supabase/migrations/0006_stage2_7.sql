-- 古問 LORE — Stage 2–7 database changes
-- Run after 0005_stage1_spec_gaps.sql.
--
--   * profiles.nickname_chosen — first-time readers choose a nickname.
--   * reflection_feed() now supports LIMIT/OFFSET for pagination.
--   * admin_analytics() accepts a date range.
--   * AI insights can only be written by the service role (the server).
--   * supporting indexes.
--
-- Re-running the nickname backfill marks every existing profile as having
-- chosen a nickname. That is intended for this one-time migration; do not
-- re-run it after real users have signed up.

-- ─────────────────────────────────────────────────────────────
-- 1. First-time nickname
-- ─────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists nickname_chosen boolean not null default false;

-- Existing accounts keep their current nickname; new accounts start false.
update public.profiles set nickname_chosen = true where nickname_chosen = false;

-- The 0002 grant only covers nickname and language. The welcome/profile
-- forms also write nickname_chosen, so grant that column explicitly.
grant update (nickname_chosen) on public.profiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Paginated reflection feed
-- ─────────────────────────────────────────────────────────────

drop function if exists public.reflection_feed(uuid);

create or replace function public.reflection_feed(
  p_question uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id             uuid,
  body           text,
  is_anonymous   boolean,
  nickname       text,
  submitted_at   timestamptz,
  like_count     bigint,
  comment_count  bigint,
  liked_by_me    boolean,
  is_mine        boolean
)
language sql stable security definer set search_path = ''
as $$
  select
    r.id,
    r.body,
    r.is_anonymous,
    case when r.is_anonymous then null else p.nickname end,
    r.submitted_at,
    (select count(*) from public.likes l where l.reflection_id = r.id),
    (select count(*) from public.comments c
       where c.reflection_id = r.id and c.status = 'visible'),
    exists (select 1 from public.likes l
              where l.reflection_id = r.id and l.user_id = auth.uid()),
    coalesce(r.user_id = auth.uid(), false)
  from public.reflections r
  join public.profiles p on p.id = r.user_id
  where r.question_id = p_question
    and r.status = 'published'
    and public.has_reflected(p_question)
  order by r.submitted_at desc, r.id
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.reflection_feed(uuid, integer, integer) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Admin analytics with a date range
-- ─────────────────────────────────────────────────────────────

drop view if exists public.analytics_summary;
drop function if exists public.admin_analytics();

create or replace function public.admin_analytics(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  question_id     uuid,
  visitors        bigint,
  visitors_signed_in bigint,
  opened_text     bigint,
  finished_text   bigint,
  asked_ai        bigint,
  reflected       bigint,
  unlocked        bigint,
  commented       bigint,
  feedback_count  bigint,
  avg_rating      numeric,
  avg_ai_helped   numeric,
  avg_own_view    numeric
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  with actors as (
    select e.question_id as qid, e.type,
           coalesce(e.user_id::text, e.anon_id) as actor,
           e.user_id is not null as signed_in
    from public.events e
    where e.question_id is not null
      and coalesce(e.user_id::text, e.anon_id) is not null
      and (p_from is null or e.created_at >= p_from)
      and (p_to is null or e.created_at < p_to)
  ),
  funnel as (
    select
      a.qid,
      grouping(a.qid) = 1 as is_total,
      count(distinct a.actor) filter (where a.type = 'view_question')     as visitors,
      count(distinct a.actor) filter (where a.type = 'view_question' and a.signed_in) as visitors_signed_in,
      count(distinct a.actor) filter (where a.type = 'open_text')         as opened_text,
      count(distinct a.actor) filter (where a.type = 'finish_text')       as finished_text,
      count(distinct a.actor) filter (where a.type = 'ask_ai')            as asked_ai,
      count(distinct a.actor) filter (where a.type = 'submit_reflection') as reflected,
      count(distinct a.actor) filter (where a.type = 'unlock')            as unlocked,
      count(distinct a.actor) filter (where a.type = 'comment')           as commented
    from actors a
    group by grouping sets ((a.qid), ())
  ),
  fb as (
    select
      f.question_id as qid,
      grouping(f.question_id) = 1 as is_total,
      count(*) as n,
      round(avg(f.rating), 2) as rating,
      round(avg(f.ai_helped), 2) as ai_helped,
      round(avg(f.own_view), 2) as own_view
    from public.feedback f
    where f.question_id is not null
      and (p_from is null or f.created_at >= p_from)
      and (p_to is null or f.created_at < p_to)
    group by grouping sets ((f.question_id), ())
  )
  select
    coalesce(fu.qid, fb.qid),
    coalesce(fu.visitors, 0), coalesce(fu.visitors_signed_in, 0),
    coalesce(fu.opened_text, 0), coalesce(fu.finished_text, 0),
    coalesce(fu.asked_ai, 0), coalesce(fu.reflected, 0), coalesce(fu.unlocked, 0),
    coalesce(fu.commented, 0),
    coalesce(fb.n, 0), fb.rating, fb.ai_helped, fb.own_view
  from funnel fu
  full join fb on fb.is_total = fu.is_total and fb.qid is not distinct from fu.qid
  order by coalesce(fu.qid, fb.qid) nulls first;
end;
$$;

grant execute on function public.admin_analytics(timestamptz, timestamptz) to authenticated;

create or replace view public.analytics_summary
with (security_invoker = true) as
select * from public.admin_analytics();

grant select on public.analytics_summary to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. AI insights: server-only writes
-- ─────────────────────────────────────────────────────────────

drop policy if exists "admin writes insights" on public.ai_insights;
drop policy if exists "admin deletes insights" on public.ai_insights;
revoke insert, delete on public.ai_insights from authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────────────────────

create index if not exists reflections_feed_order
  on public.reflections (question_id, status, submitted_at desc);
create index if not exists feedback_created_at on public.feedback (created_at);
