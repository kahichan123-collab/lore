-- 古問 LORE — schema
-- Run in the Supabase SQL editor (or `supabase db push`), before 0002_rls.sql.

-- ─────────────────────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 1 and 30),
  language    text not null default 'zh-HK' check (language in ('zh-HK', 'en')),
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Emails that become admins on sign-up. Filled by `npm run seed` from ADMIN_EMAILS.
create table public.admin_emails (
  email text primary key check (email = lower(email))
);

-- ─────────────────────────────────────────────────────────────
-- Content
-- ─────────────────────────────────────────────────────────────

create table public.classics (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title_zh        text not null,
  title_en        text not null,
  author_zh       text not null,
  author_en       text not null,
  era_zh          text,
  era_en          text,
  description_zh  text,
  description_en  text,
  created_at      timestamptz not null default now()
);

create table public.excerpts (
  id                  uuid primary key default gen_random_uuid(),
  classic_id          uuid not null references public.classics (id) on delete cascade,
  -- Paragraphs are separated by a blank line.
  text_zh             text,
  text_en             text,
  -- true when text_zh is an original summary rather than a translation.
  text_zh_is_summary  boolean not null default false,
  source_note         text not null,
  translator          text,
  created_at          timestamptz not null default now()
);

create table public.questions (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  question_zh  text not null,
  question_en  text not null,
  tags         text[] not null default '{}',
  difficulty   smallint not null default 1 check (difficulty between 1 and 3),
  excerpt_id   uuid references public.excerpts (id) on delete set null,
  status       text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Community
-- ─────────────────────────────────────────────────────────────

create table public.reflections (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references public.questions (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  initial_answer  text check (char_length(initial_answer) <= 500),
  body            text not null default '' check (char_length(body) <= 1500),
  is_anonymous    boolean not null default false,
  -- draft → published (by the author); published ⇄ hidden (by an admin)
  status          text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  unique (question_id, user_id),
  constraint reflection_min_length check (status = 'draft' or char_length(btrim(body)) >= 50)
);

create table public.comments (
  id             uuid primary key default gen_random_uuid(),
  reflection_id  uuid not null references public.reflections (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  parent_id      uuid references public.comments (id) on delete cascade,
  body           text not null check (char_length(btrim(body)) between 1 and 1000),
  status         text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at     timestamptz not null default now()
);

create table public.likes (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  reflection_id  uuid not null references public.reflections (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, reflection_id)
);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('reflection', 'comment')),
  target_id    uuid not null,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text not null check (char_length(btrim(reason)) between 1 and 500),
  status       text not null default 'open' check (status in ('open', 'resolved')),
  created_at   timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

-- ─────────────────────────────────────────────────────────────
-- AI
-- ─────────────────────────────────────────────────────────────

-- One row per AI Companion call. Counts only — no message content.
create table public.ai_messages_usage (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  question_id  uuid references public.questions (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Cached community summaries; the newest row per question is shown.
create table public.ai_insights (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.questions (id) on delete cascade,
  summary_json  jsonb not null,
  generated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Analytics
-- ─────────────────────────────────────────────────────────────

create table public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete set null,
  -- Random per-browser id so signed-out visitors can be counted.
  anon_id      text check (char_length(anon_id) <= 64),
  question_id  uuid references public.questions (id) on delete cascade,
  type         text not null check (type in (
                 'view_question', 'open_text', 'finish_text', 'ask_ai',
                 'submit_reflection', 'unlock', 'comment')),
  created_at   timestamptz not null default now()
);

create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete set null,
  question_id   uuid references public.questions (id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  ai_helped     smallint check (ai_helped between 1 and 5),
  own_view      smallint check (own_view between 1 and 5),
  comment       text check (char_length(comment) <= 500),
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

create index on public.excerpts (classic_id);
create index on public.questions (status);
create index on public.reflections (question_id, status);
create index on public.comments (reflection_id);
create index on public.likes (reflection_id);
create index on public.ai_messages_usage (user_id, created_at);
create index on public.ai_insights (question_id, generated_at desc);
create index on public.events (question_id, type);
create index on public.events (created_at);
create index on public.reports (status);
