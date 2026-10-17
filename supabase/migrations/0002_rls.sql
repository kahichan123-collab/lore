-- 古問 LORE — functions, triggers, privileges and Row Level Security
-- Run after 0001_schema.sql.
--
-- THE UNLOCK RULE
--   Nobody can read another user's reflection (or the comments, likes and
--   AI insight under it) for a question until they have submitted their own
--   reflection for that same question.
--
--   How it is enforced:
--   * `reflections`, `comments` and `likes` tables: a user can only SELECT
--     their own rows (admins: all). There is no path to other people's rows
--     through the table API at all.
--   * Other people's content is served only by the SECURITY DEFINER
--     functions `reflection_feed()` and `comment_feed()`, which return
--     nothing unless `has_reflected(question)` is true for the caller.
--     They also strip the author's identity from anonymous reflections,
--     which plain RLS cannot do (RLS filters rows, not columns).
--   * Writing a comment or like also requires `has_reflected`.

-- ─────────────────────────────────────────────────────────────
-- Helper functions
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false);
$$;

-- True once the caller has submitted (not merely drafted) a reflection
-- for the question. A reflection later hidden by a moderator still counts.
create or replace function public.has_reflected(p_question uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.reflections r
    where r.question_id = p_question
      and r.user_id = auth.uid()
      and r.status in ('published', 'hidden'));
$$;

create or replace function public.question_of_reflection(p_reflection uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select r.question_id from public.reflections r where r.id = p_reflection;
$$;

create or replace function public.reflection_is_published(p_reflection uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.reflections r
    where r.id = p_reflection and r.status = 'published');
$$;

-- ─────────────────────────────────────────────────────────────
-- New user → profile
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname, is_admin)
  values (
    new.id,
    '讀者' || lpad(floor(random() * 10000)::int::text, 4, '0'),
    exists (select 1 from public.admin_emails a where a.email = lower(new.email)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Write guards
-- ─────────────────────────────────────────────────────────────
-- "privileged" = an admin, or a connection with no user (the service-role
-- key or the SQL editor). Everyone else gets the restricted rules below.

create or replace function public.reflections_guard()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  privileged boolean := auth.uid() is null or public.is_admin();
begin
  new.updated_at := now();

  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.question_id <> old.question_id then
      raise exception 'A reflection cannot change owner or question';
    end if;
    new.created_at := old.created_at;
  end if;

  if not privileged then
    if tg_op = 'UPDATE' and old.status = 'hidden' then
      raise exception 'This reflection has been hidden by a moderator';
    end if;
    if new.status = 'hidden' then
      raise exception 'Only moderators can hide reflections';
    end if;
    if tg_op = 'UPDATE' and old.status = 'published' and new.status = 'draft' then
      raise exception 'A submitted reflection cannot go back to draft';
    end if;
    new.submitted_at := case
      when tg_op = 'UPDATE' and old.submitted_at is not null then old.submitted_at
      when new.status = 'published' then now()
      else null
    end;
  elsif new.status <> 'draft' and new.submitted_at is null then
    new.submitted_at := now();
  end if;

  return new;
end;
$$;

create trigger reflections_guard
  before insert or update on public.reflections
  for each row execute function public.reflections_guard();

create or replace function public.comments_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  privileged boolean := auth.uid() is null or public.is_admin();
  parent_reflection uuid;
  grandparent uuid;
begin
  if tg_op = 'UPDATE' then
    -- Only moderation status may change.
    new.reflection_id := old.reflection_id;
    new.user_id := old.user_id;
    new.parent_id := old.parent_id;
    new.body := old.body;
    new.created_at := old.created_at;
    return new;
  end if;

  if new.parent_id is not null then
    select c.reflection_id, c.parent_id into parent_reflection, grandparent
    from public.comments c where c.id = new.parent_id;
    if parent_reflection is distinct from new.reflection_id then
      raise exception 'A reply must belong to the same reflection as its parent';
    end if;
    if grandparent is not null then
      raise exception 'Replies can only be nested one level deep';
    end if;
  end if;

  if not privileged then
    new.status := 'visible';
    new.created_at := now();
    if (select count(*) from public.comments c
        where c.user_id = new.user_id
          and c.created_at > now() - interval '10 minutes') >= 10 then
      raise exception 'Too many comments — please wait a few minutes';
    end if;
  end if;

  return new;
end;
$$;

create trigger comments_guard
  before insert or update on public.comments
  for each row execute function public.comments_guard();

-- ─────────────────────────────────────────────────────────────
-- Read functions (the only way to see other people's content)
-- ─────────────────────────────────────────────────────────────

create or replace function public.reflection_feed(p_question uuid)
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
  order by r.submitted_at desc;
$$;

create or replace function public.comment_feed(p_question uuid)
returns table (
  id             uuid,
  reflection_id  uuid,
  parent_id      uuid,
  body           text,
  nickname       text,
  -- true when the comment is by the reflection's author
  is_author      boolean,
  created_at     timestamptz,
  is_mine        boolean
)
language sql stable security definer set search_path = ''
as $$
  select
    c.id,
    c.reflection_id,
    c.parent_id,
    c.body,
    -- An anonymous author replying in their own thread stays anonymous.
    case when c.user_id = r.user_id and r.is_anonymous then null else p.nickname end,
    c.user_id = r.user_id,
    c.created_at,
    coalesce(c.user_id = auth.uid(), false)
  from public.comments c
  join public.reflections r on r.id = c.reflection_id
  join public.profiles p on p.id = c.user_id
  where r.question_id = p_question
    and r.status = 'published'
    and c.status = 'visible'
    and public.has_reflected(p_question)
  order by c.created_at;
$$;

-- Public, aggregate only: how many people opened each question's text.
create or replace function public.question_reader_counts()
returns table (question_id uuid, readers bigint)
language sql stable security definer set search_path = ''
as $$
  select e.question_id, count(distinct coalesce(e.user_id::text, e.anon_id))
  from public.events e
  where e.type = 'open_text' and e.question_id is not null
  group by e.question_id;
$$;

-- ─────────────────────────────────────────────────────────────
-- Privileges
-- ─────────────────────────────────────────────────────────────
-- Supabase grants everything to anon/authenticated by default and relies on
-- RLS alone. We start from nothing and grant only what the app needs.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- The service role is the server's privileged connection: seeding, the AI
-- Insight job and account deletion. It bypasses RLS, but it still needs
-- ordinary table privileges. Supabase usually grants these by default; we
-- make it explicit so a project created by a different role still works.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

grant select on public.classics, public.excerpts, public.questions to anon, authenticated;
grant insert, update, delete on public.classics, public.excerpts, public.questions to authenticated;

grant select, delete on public.profiles to authenticated;
grant update (nickname, language) on public.profiles to authenticated;

grant select, insert, update, delete on public.reflections to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select, insert, delete on public.likes to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert on public.ai_messages_usage to authenticated;
grant select, insert, delete on public.ai_insights to authenticated;
grant insert on public.events to anon, authenticated;
grant select on public.events to authenticated;
grant insert on public.feedback to authenticated;
grant select on public.feedback to authenticated;

grant execute on function
  public.is_admin(),
  public.has_reflected(uuid),
  public.question_of_reflection(uuid),
  public.reflection_is_published(uuid),
  public.reflection_feed(uuid),
  public.comment_feed(uuid),
  public.question_reader_counts()
to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.admin_emails      enable row level security;
alter table public.classics          enable row level security;
alter table public.excerpts          enable row level security;
alter table public.questions         enable row level security;
alter table public.reflections       enable row level security;
alter table public.comments          enable row level security;
alter table public.likes             enable row level security;
alter table public.reports           enable row level security;
alter table public.ai_messages_usage enable row level security;
alter table public.ai_insights       enable row level security;
alter table public.events            enable row level security;
alter table public.feedback          enable row level security;

-- profiles
create policy "read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "delete own profile" on public.profiles
  for delete using (id = auth.uid());

-- admin_emails: no policies → service role only.

-- content: public read, admin write
create policy "read classics" on public.classics for select using (true);
create policy "admin writes classics" on public.classics
  for all using (public.is_admin()) with check (public.is_admin());

create policy "read excerpts" on public.excerpts for select using (true);
create policy "admin writes excerpts" on public.excerpts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "read published questions" on public.questions
  for select using (status = 'published' or public.is_admin());
create policy "admin writes questions" on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

-- reflections: own rows only (others via reflection_feed)
create policy "read own reflections" on public.reflections
  for select using (user_id = auth.uid() or public.is_admin());
create policy "write own reflection" on public.reflections
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.questions q
                where q.id = question_id and q.status = 'published'));
create policy "update own reflection" on public.reflections
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "delete own reflection" on public.reflections
  for delete using (user_id = auth.uid() or public.is_admin());

-- comments: own rows only (others via comment_feed); writing needs unlock
create policy "read own comments" on public.comments
  for select using (user_id = auth.uid() or public.is_admin());
create policy "comment after unlocking" on public.comments
  for insert with check (
    user_id = auth.uid()
    and public.reflection_is_published(reflection_id)
    and public.has_reflected(public.question_of_reflection(reflection_id)));
create policy "admin moderates comments" on public.comments
  for update using (public.is_admin()) with check (public.is_admin());
create policy "delete own comment" on public.comments
  for delete using (user_id = auth.uid() or public.is_admin());

-- likes
create policy "read own likes" on public.likes
  for select using (user_id = auth.uid());
create policy "like after unlocking" on public.likes
  for insert with check (
    user_id = auth.uid()
    and public.reflection_is_published(reflection_id)
    and public.has_reflected(public.question_of_reflection(reflection_id)));
create policy "unlike" on public.likes
  for delete using (user_id = auth.uid());

-- reports
create policy "file a report" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "admin reads reports" on public.reports
  for select using (public.is_admin());
create policy "admin resolves reports" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- AI usage counter
create policy "read own ai usage" on public.ai_messages_usage
  for select using (user_id = auth.uid() or public.is_admin());
create policy "log own ai usage" on public.ai_messages_usage
  for insert with check (user_id = auth.uid());

-- AI insights: behind the same unlock as reflections
create policy "read insight after unlocking" on public.ai_insights
  for select using (public.has_reflected(question_id) or public.is_admin());
create policy "admin writes insights" on public.ai_insights
  for insert with check (public.is_admin());
create policy "admin deletes insights" on public.ai_insights
  for delete using (public.is_admin());

-- events: anyone may log their own; only admins read
create policy "log own events" on public.events
  for insert with check (user_id is null or user_id = auth.uid());
create policy "admin reads events" on public.events
  for select using (public.is_admin());

-- feedback
create policy "give feedback" on public.feedback
  for insert with check (user_id = auth.uid());
create policy "admin reads feedback" on public.feedback
  for select using (public.is_admin());
