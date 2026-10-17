-- 古問 LORE — feedback rules and admin analytics
-- Run after 0002_rls.sql.

-- ─────────────────────────────────────────────────────────────
-- Feedback: one per reader per question; readers can see their own
-- (so the form isn't shown twice).
-- ─────────────────────────────────────────────────────────────

alter table public.feedback
  add constraint feedback_one_per_question unique (user_id, question_id);

create policy "read own feedback" on public.feedback
  for select using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Analytics for the admin dashboard and grant report.
--
-- One row per question, plus a total row where question_id is null.
-- Each column counts distinct people (signed-in user, or a signed-out
-- browser's anon_id) who did that thing at least once.
-- ─────────────────────────────────────────────────────────────

create or replace function public.admin_analytics()
returns table (
  question_id     uuid,
  visitors        bigint,
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
    select e.question_id as qid, e.type, coalesce(e.user_id::text, e.anon_id) as actor
    from public.events e
    where e.question_id is not null
      and coalesce(e.user_id::text, e.anon_id) is not null
  ),
  funnel as (
    select
      a.qid,
      grouping(a.qid) = 1 as is_total,
      count(distinct a.actor) filter (where a.type = 'view_question')     as visitors,
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
    group by grouping sets ((f.question_id), ())
  )
  select
    coalesce(fu.qid, fb.qid),
    coalesce(fu.visitors, 0), coalesce(fu.opened_text, 0), coalesce(fu.finished_text, 0),
    coalesce(fu.asked_ai, 0), coalesce(fu.reflected, 0), coalesce(fu.unlocked, 0),
    coalesce(fu.commented, 0),
    coalesce(fb.n, 0), fb.rating, fb.ai_helped, fb.own_view
  from funnel fu
  full join fb on fb.is_total = fu.is_total and fb.qid is not distinct from fu.qid
  order by coalesce(fu.qid, fb.qid) nulls first;
end;
$$;

grant execute on function public.admin_analytics() to authenticated;
