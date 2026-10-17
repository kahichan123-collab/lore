-- 古問 LORE — Stage 1 alignment migration
-- Run after 0004_rate_limits.sql.
--
-- The MVP already had the tables, RLS and analytics described in the brief.
-- This migration adds only the pieces the new brief needs and that were
-- missing, without renaming or rewriting the tested schema:
--
--   * `feedback` is now a valid analytics event type.
--   * `ai_insights.response_count` records the sample size used for a summary.
--   * `ai_usage` exposes the existing `ai_messages_usage` counter under the
--     name used in the brief (a view, so there is still one source of truth).
--   * `excerpts.license_note` can record a licence or rights note.
--   * `question_reflection_count()` lets the locked state show how many
--     reflections are waiting without exposing any of them.
--   * `analytics_summary` exposes the admin-only analytics function as a view.
--
-- Safe to run more than once: columns use IF NOT EXISTS, the event-type
-- constraint is dropped and recreated, functions/views are replaced.

-- ─────────────────────────────────────────────────────────────
-- 1. AI Insight sample size
-- ─────────────────────────────────────────────────────────────

alter table public.ai_insights
  add column if not exists response_count integer not null default 0;

-- Backfill rows generated before this column existed; summary_json->>'total'
-- is written by lib/ai/insight-summary.ts.
update public.ai_insights
set response_count = coalesce((summary_json ->> 'total')::integer, 0)
where response_count = 0;

-- ─────────────────────────────────────────────────────────────
-- 2. `feedback` event type
-- ─────────────────────────────────────────────────────────────
-- Drop whichever CHECK constraint guards events.type (its generated name can
-- differ between projects), then install the complete list.

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%type%'
  loop
    execute format('alter table public.events drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.events
  add constraint events_type_check check (type in (
    'view_question', 'open_text', 'finish_text', 'ask_ai',
    'submit_reflection', 'unlock', 'comment', 'feedback'));

-- ─────────────────────────────────────────────────────────────
-- 3. Brief-compatible name for the AI usage counter
-- ─────────────────────────────────────────────────────────────
-- security_invoker keeps the table's RLS in force: a reader sees only their
-- own rows, not everybody's usage.

create or replace view public.ai_usage
with (security_invoker = true) as
select id, user_id, question_id, created_at
from public.ai_messages_usage;

-- ─────────────────────────────────────────────────────────────
-- 4. Rights metadata for excerpts
-- ─────────────────────────────────────────────────────────────

alter table public.excerpts
  add column if not exists license_note text;

-- ─────────────────────────────────────────────────────────────
-- 5. Locked-state count
-- ─────────────────────────────────────────────────────────────
-- Only a number is returned. It is safe for signed-out visitors and does not
-- reveal bodies, authors or anything else.

create or replace function public.question_reflection_count(p_question uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
  from public.reflections r
  where r.question_id = p_question
    and r.status = 'published';
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Analytics view
-- ─────────────────────────────────────────────────────────────
-- Same rows and columns as admin_analytics(); the function itself refuses
-- anyone who is not an admin.

create or replace view public.analytics_summary
with (security_invoker = true) as
select * from public.admin_analytics();

grant execute on function public.question_reflection_count(uuid) to anon, authenticated;
grant select on public.ai_usage to authenticated;
grant select on public.analytics_summary to authenticated;
