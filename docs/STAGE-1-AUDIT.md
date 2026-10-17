# Stage 1 audit — what exists, what is missing

> **Update after Stage 1:** Stages 2–7 have since been implemented: the
> Anthropic client is replaced by DeepSeek, the feed is paginated, locked
> counts and first-time nicknames are live, feedback uses Yes/Somewhat/No,
> analytics has a date filter, the CSV no longer exports identifiers, the
> admin import tool exists, and the seed has 8 classics / 20 questions.
> This document remains the Stage 1 snapshot; see the README for the current
> state.

Audit of `Choi-cpuww/lore` at commit `2d3ddd5` ("古問 LORE MVP"), before any
feature work beyond the Stage 1 schema additions.

## The ten-line version

1. **Stack:** Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS 4, next-intl (zh-HK default, `/en`), Supabase (Postgres + Auth), Zod.
2. **Pages:** 14 `page.tsx` files: home, library, classic detail, question flow, login, me, admin dashboard/content/moderation, privacy, guidelines, error/not-found.
3. **Question flow:** seven steps in `components/question/QuestionFlow.tsx` — first thought → read text → AI companion → write reflection → unlock community → discuss → AI insight.
4. **Auth:** `@supabase/ssr` magic-link sign-in, `/auth/callback`, `/auth/signout`, profile row, nickname editing, account deletion. Auth is wired, not mocked.
5. **Database:** four migrations with profiles, classics, excerpts, questions, reflections, comments, likes, reports, AI usage/insights, events, feedback; RLS on every table; triggers create profiles and enforce write rules.
6. **Unlock rule:** enforced in Postgres, not the UI. Users can select only their own rows; other people's rows come from `SECURITY DEFINER` functions `reflection_feed()` / `comment_feed()`, which return nothing without a submitted reflection and strip anonymous names.
7. **Discussion:** comments with one nesting level, likes, reports, profanity filter, admin hide/unhide/delete/dismiss. Working, not stubbed.
8. **AI:** Companion route, prompt builder, input/output verdict guards, per-user 24 h counter, and an AI Insight job (admin button + Vercel Cron) using the **Anthropic SDK**. This is the main mismatch with the brief.
9. **Analytics:** `admin_analytics()` RPC, dashboard, targets, per-question table, summary/events/feedback CSV export, formula-injection protection. Working, but no date filter and the `feedback` event was never written.
10. **Content and tests:** one classic (*Republic*), one excerpt, five questions (four without an excerpt). 76 tests passed at audit time; typecheck, lint and production build were green.

## What is genuinely working

| Area | Status | Evidence |
| --- | --- | --- |
| Magic-link auth + callback | Working | `app/[locale]/login/actions.ts`, `app/auth/callback/route.ts` |
| Supabase SSR session refresh | Working | `middleware.ts`, `lib/supabase/middleware.ts` |
| Profiles + admin flag | Working | trigger `handle_new_user()`, `profiles.is_admin` |
| Published content read | Working (RLS) | `0002_rls.sql` policies |
| Reflection draft/submit/edit | Working | `lib/actions/question.ts`, `ReflectionEditor.tsx` |
| Unlock rule | Working + tested | `reflection_feed()`; `tests/unlock-rls.test.ts` |
| Anonymous masking | Working | `reflection_feed()` / `comment_feed()` return `null` nickname |
| Comments / likes / reports | Working | `CommentThread.tsx`, `setLike`, `reportContent` |
| Moderation | Working | `/admin/moderation`, `lib/actions/admin.ts` |
| Events + analytics RPC | Working | `trackEvent()`, `admin_analytics()`, `/admin` |
| CSV export | Working | `/api/admin/export` |
| AI Companion guardrails | Working | `lib/ai/guard.ts`, `tests/ai-guard.test.ts` |
| AI Insight | Working, Anthropic-specific | `lib/ai/insight.ts`, `InsightButton.tsx` |
| Privacy / guidelines pages | Present | `messages/*.json` namespaces |
| Delete own content / account | Working | `lib/actions/profile.ts` |

## Gaps against the new brief

### A. AI provider (Stage 4)

- Code imports `@anthropic-ai/sdk`; env vars are `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`.
- The brief fixes the provider as **DeepSeek** through the OpenAI-compatible API, with `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL_CHAT`, `AI_MODEL_INSIGHT`.
- No trap-prompt script exists.
- Insight uses Anthropic structured outputs and a minimum of **3** reflections; the brief asks for **5** and strict JSON via Zod + one retry.
- `ai_insights` did not record `response_count`; added in `0005`.
- The AI routes return JSON; the front-end has no streaming UI, so this is acceptable under the brief ("stream if the front-end supports it; otherwise return JSON").

### B. Reflection / unlock UX (Stage 3)

- The database rule is solid, but the locked page shows no count. A new
  `question_reflection_count()` function is in `0005`; the UI still needs to use it.
- `reflection_feed()` returns every row; no pagination yet.
- First-time users get an automatic nickname (`讀者1234`) rather than being asked to choose one.

### C. Analytics (Stage 5)

- No date-range filter on the dashboard or the CSV export.
- `feedback` was in the event-type list of the brief but not in the database enum; added in `0005`. The server action still needs to insert it.
- The raw-events CSV includes `user_id` / `anon_id`. The brief says analytics must not show personal data; this export needs pseudonymised or removed identifiers.
- Latest feedback comments are not shown on the dashboard.
- Dashboard shows average `ai_helped` and `own_view` on a 1–5 scale; the brief asks a Yes / Somewhat / No question. The UI can map those three answers to 5 / 3 / 1 and keep the numeric analytics.

### D. Content and admin import (Stage 6)

- Only one classic and one excerpt; four of five questions have no text.
- No `supabase/seed/seed_content.sql`; the seed is TypeScript only.
- No CSV/JSON import tool; only one-at-a-time admin forms.
- Minimum insight sample is 3, not 5.

### E. Quality and tests (Stages 3–7)

- No automated test for the AI daily limit.
- No test that invalid Insight JSON is rejected/retried.
- No browser end-to-end test.
- README, deployment guide, privacy text and UI messages still mention Anthropic and five questions.
- `ai_insights` has an admin INSERT policy; the brief asks for server-only writes. The server uses the service role already, so this can be tightened without breaking the admin button.
- No Content-Security-Policy header (noted in the existing risk register).

## What Stage 1 changed

1. **`supabase/migrations/0005_stage1_spec_gaps.sql`**
   - adds `feedback` to the `events.type` check;
   - adds `ai_insights.response_count` and backfills it;
   - exposes `ai_usage` as a `security_invoker` view over `ai_messages_usage`;
   - adds `excerpts.license_note`;
   - adds `question_reflection_count()` for the locked-state count;
   - exposes `analytics_summary` as a view over `admin_analytics()`.
2. **`.env.example`** now lists the Supabase, DeepSeek, admin and cron variables from the brief, using the required names.
3. **Tests** load `0005` and cover the locked count and the `ai_usage` view (79 tests pass).

No UI, auth, reflection or AI behaviour was rewritten in Stage 1.

## Decisions and assumptions

- **Keep the existing migrations instead of creating `001_init.sql`.** They already contain the requested schema and are covered by tests; a second consolidated baseline would be a second source of truth. The equivalent of `001_init.sql` is the ordered set `0001` → `0005`.
- **Keep the richer status model.** `reflections` uses `draft | published | hidden` rather than `visible | hidden`; `published` is the visible state. This is what the draft/submit flow needs.
- **Keep the Chinese-summary boolean.** `excerpts.text_zh_is_summary` carries the same meaning as `text_type = 'summary'` for Chinese; English excerpts are translations. Renaming it would touch the reader, admin forms, seed and AI context for no functional gain.
- **Keep Anthropic code until Stage 4.** Stage 1 only fixes the environment contract and schema. The AI panel reports "not configured" until the DeepSeek client lands.
- **No secrets in this repository.** `.env.local` is ignored by `.gitignore`; no key is printed in logs or committed.

## Baseline checks (before Stage 2)

```
npm test         79 passed
npm run typecheck  clean
npm run lint       clean
npm run build      clean
```
