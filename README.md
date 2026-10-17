# 古問 LORE

**先讀，再思考，再對話。 · Read before you react.**

An interactive classics-reading platform: start from a contemporary question, read the original text, get help understanding it from an AI that never tells you what to think, write your own reflection — and only then see everyone else's.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, RLS, magic-link auth) · DeepSeek API (OpenAI-compatible) · next-intl (繁體中文 / English).

**Docs:** [Deploying to Vercel + Supabase](docs/DEPLOYMENT.md) · [Remaining risks and next steps](docs/RISKS-AND-NEXT-STEPS.md) · [Stage 1 audit](docs/STAGE-1-AUDIT.md) · [Stage 1 setup checklist](docs/STAGE-1-CHECKLIST.md) · [第一階段設定清單（中文）](docs/STAGE-1-CHECKLIST.zh-CN.md) · [目前完成狀態（中文）](docs/FINAL-STATUS.zh-CN.md)

> **Status:** the code is wired for Supabase + DeepSeek, with 8 classics, 20 questions, feedback, pagination, date-filtered analytics and an import tool. It has **not yet run against a live Supabase project or a live DeepSeek key**; the remaining live checks are listed in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Run it locally

You need **Node.js 20+** (`node -v`).

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Without Supabase configured the site runs in **demo mode**: the home page shows built-in sample questions and sign-in is disabled. Follow the steps below to make it fully work.

## 1. Create a Supabase project (free tier)

1. Sign up at <https://supabase.com> and create a new project. Pick a region close to your users (e.g. Singapore for Hong Kong).
2. Open **SQL Editor → New query**. The simplest path is to paste the whole of [`supabase/install/lore_all_in_one.sql`](supabase/install/lore_all_in_one.sql) and click **Run**. It is the six migrations below, concatenated for a fresh project.
3. Or run the files in [`supabase/migrations/`](supabase/migrations/) one at a time, in number order: `0001_schema.sql`, `0002_rls.sql`, `0003_admin_analytics.sql`, `0004_rate_limits.sql`, `0005_stage1_spec_gaps.sql`, `0006_stage2_7.sql`. Do not run both the one-file installer and the numbered files on the same project.
4. **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:3000` (change to your real domain when you deploy)
   - *Redirect URLs*: add `http://localhost:3000/auth/callback` (and later `https://your-domain/auth/callback`)
5. **Authentication → Sign In / Providers → Email**: make sure Email is enabled. Passwords are never used; the app only sends magic links.

> Supabase's built-in email sender is limited to a few emails per hour — fine for testing. For a real launch, add a free SMTP provider (e.g. Resend) under **Authentication → Emails → SMTP Settings**.

## 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in from **Project Settings → API** (or **API Keys**):

| Variable | Where | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable key | no — RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` / secret key | **yes — server only** |
| `ADMIN_EMAILS` | your email(s), comma-separated | no |
| `AI_BASE_URL` | `https://api.deepseek.com` | no |
| `AI_API_KEY` | <https://platform.deepseek.com> → API Keys | **yes — server only** |
| `AI_MODEL_CHAT` | `deepseek-flash` | no |
| `AI_MODEL_INSIGHT` | `deepseek-v4-pro` (or `deepseek-flash`) | no |
| `AI_DAILY_LIMIT_PER_USER` | AI Companion questions per user per 24 h (default 20) | no |
| `CRON_SECRET` | any long random string; protects the weekly insight job | **yes** |

## 3. Seed demo content

```bash
npm run seed
```

This loads eight public-domain classics (Plato, Aristotle, Hobbes, Rousseau, Mill, Machiavelli, the Analects and Mencius), one focused excerpt each, and twenty bilingual questions. It also registers `ADMIN_EMAILS` as admins. It is safe to run again.

Restart `npm run dev`, then sign in with your email.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on <http://localhost:3000> |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests, including the **unlock-rule tests**, which run the real SQL migrations in an in-memory Postgres (no Supabase needed) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run seed` | Load demo content and admins |
| `npm run setup:check` | Check `.env.local`, Supabase tables and the DeepSeek key without printing secrets |
| `npm run migrations:build` | Regenerate the one-file SQL installer from `0001`–`0006` |
| `npm run ai:trap` | Send five trap prompts to the real DeepSeek model and print the replies |

## How the unlock rule is enforced

The core rule — *you can't see others' reflections until you've submitted your own* — is enforced in the database, not the UI:

- The `reflections`, `comments` and `likes` tables only let a user read **their own** rows (RLS).
- Other people's content comes only from the Postgres functions `reflection_feed()` and `comment_feed()`, which return nothing unless `has_reflected(question)` is true for the caller. They also strip names from anonymous posts.
- Commenting, liking and reading the AI Insight require the same unlock.

See the header of [`0002_rls.sql`](supabase/migrations/0002_rls.sql) and the tests in [`tests/unlock-rls.test.ts`](tests/unlock-rls.test.ts).

## How the AI is kept in its lane

**AI Companion** (`POST /api/ai/companion`) explains words, people and background. It never gives an answer to the question.

- **System prompt** ([`lib/ai/prompts.ts`](lib/ai/prompts.ts)) states the rules and includes the excerpt with numbered paragraphs, loaded from the database rather than the browser.
- **Input guard** ([`lib/ai/guard.ts`](lib/ai/guard.ts)) catches questions that only ask for a verdict ("what's the answer?", 「我應該點諗？」) and replies with a guiding question, without calling the model or using up the reader's quota.
- **Output guard** replaces any answer that slips into a conclusion ("the correct answer is…").
- **Limits.** Readers must be signed in, and each gets `AI_DAILY_LIMIT_PER_USER` questions per 24 hours. Only a count is stored (`ai_messages_usage`), never the conversation.
- **DeepSeek.** The server uses the official `openai` package with `baseURL = AI_BASE_URL` (default `https://api.deepseek.com`). Chat runs with thinking disabled; the Insight uses JSON mode.
- **Tests:** `tests/ai-guard.test.ts`, `tests/ai-limit.test.ts` and `npm run ai:trap` (manual, needs a real key).

**AI Insight** groups everyone's reflections into neutral themes and counts how many people hold each view. The counts are computed in code, not by the model. It also names the tensions between themes, recommends 1–2 classics and a next question, and caches the result in `ai_insights`. Only reflection text is sent to the model, never names or user IDs. It is generated:

- weekly by Vercel Cron ([`vercel.json`](vercel.json) → `/api/cron/insights`), for questions with at least 5 reflections and new ones since the last insight;
- on demand by an admin, using the **Generate AI Insight** button that admins see under the discussion.

The model must return strict JSON. It is validated with Zod and retried once if invalid; the `reflection_numbers` it assigns are used to compute exact counts, with `approx_share` as a fallback.

To trigger the weekly job by hand locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/insights
```

**Cost note:** `deepseek-flash` is the default chat model and `deepseek-v4-pro` the default Insight model. Check current prices at <https://api-docs.deepseek.com/quick_start/pricing>. Set a monthly spend limit in the DeepSeek console.

## Admin (`/admin`)

Only accounts whose email is in `ADMIN_EMAILS` (applied by `npm run seed`) can open it. Everyone else gets a 404, and the database rejects non-admin writes anyway.

- **Dashboard** shows registered users, unique visitors and signed-in visitors, readers, reflections, the six funnel rates and progress towards the grant targets (500 reach / 400 finish / 400 reflections / 10% feedback). It has a Hong Kong-time date-range filter, average feedback scores, the latest written feedback and a per-question table with a **Generate AI Insight** button. CSV export covers the summary, raw events (no user or browser IDs) and feedback.
- **Content** has forms for classics, their excerpts (short, cited excerpts only) and questions, plus a **JSON/CSV import tool** for bulk additions.
- **Moderation** lists open reports, grouped per post with every reason. You can hide, unhide, delete or dismiss each one, and see a list of hidden content.

Numbers count **distinct people**: a signed-in user, or a signed-out browser's random ID. They're computed by the `admin_analytics(from, to)` database function and tested in `tests/analytics.test.ts`.

## Project layout

```
app/[locale]/          pages: home, q/[slug], library, me, welcome, admin, privacy, guidelines
app/api/ai/companion   AI Companion endpoint
app/api/cron/insights  weekly AI Insight job
app/api/admin/export   CSV export
app/auth/              magic-link callback, sign-out
components/            shared UI; question/ = the 7-step flow; admin/, me/
i18n/                  locales and routing
messages/              all UI strings: zh-HK.json, en.json
lib/actions/           server actions (question flow, profile, admin, insight)
lib/ai/                prompts, guards, DeepSeek client, Companion, Insight
lib/content/           seed content and import parsers
lib/supabase/          server, browser, service-role and middleware clients
supabase/migrations/   schema, RLS, analytics, limits, nicknames, pagination — run in order
scripts/seed.ts        seed script
scripts/ai-trap-test   manual guardrail test
tests/                 Vitest (SQL tests run on in-memory Postgres)
docs/                  deployment guide, risks, audit and checklists
```

## Content and copyright

Store only short excerpts and always show source and translator. All eight seed excerpts are public domain and carry a Gutenberg link:

| Classic | Translation | Source |
| --- | --- | --- |
| Plato, *Republic* | Benjamin Jowett (1871) | [#1497](https://www.gutenberg.org/ebooks/1497) |
| Aristotle, *Politics* | William Ellis | [#6762](https://www.gutenberg.org/ebooks/6762) |
| Hobbes, *Leviathan* | original English (1651) | [#3207](https://www.gutenberg.org/ebooks/3207) |
| Rousseau, *The Social Contract* | G. D. H. Cole (1913) | [#46333](https://www.gutenberg.org/ebooks/46333) |
| Mill, *On Liberty* | original English (1859) | [#34901](https://www.gutenberg.org/ebooks/34901) |
| Machiavelli, *The Prince* | W. K. Marriott (1908) | [#1232](https://www.gutenberg.org/ebooks/1232) |
| *Analects* | James Legge | [#3330](https://www.gutenberg.org/ebooks/3330) |
| *Mencius* | James Legge | [#10056](https://www.gutenberg.org/ebooks/10056) / Chinese [#24178](https://www.gutenberg.org/ebooks/24178) |

The Chinese text for Western classics is an original summary written for LORE and is labelled 「摘要」; it is not a translation. Don't paste modern copyrighted translations. Jowett's *Politics* was not available in a verifiable public-domain file, so the public-domain William Ellis translation is used for Aristotle. The Cole translation is public domain in the US and Hong Kong, but may still be protected in the UK/EU until 2030.

## Deploying

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**, a step-by-step guide covering GitHub, Supabase (migrations, sign-in URLs, email via Resend), Vercel (environment variables, cron), seeding, a pre-launch checklist and costs.

## Before launch

Read **[docs/RISKS-AND-NEXT-STEPS.md](docs/RISKS-AND-NEXT-STEPS.md)**. The most important items:

- the site has not yet run end to end against real Supabase and a real DeepSeek key;
- the seed English texts should still be spot-checked against the linked Gutenberg pages;
- sign-in email needs custom SMTP before a launch event;
- check whether you need research ethics approval.
