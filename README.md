# 古問 LORE

**先讀，再思考，再對話。 · Read before you react.**

An interactive classics-reading platform: start from a contemporary question, read the original text, get help understanding it from an AI that never tells you what to think, write your own reflection — and only then see everyone else's.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, RLS, magic-link auth) · Anthropic Claude API · next-intl (繁體中文 / English).

**Docs:** [Deploying to Vercel + Supabase](docs/DEPLOYMENT.md) · [Remaining risks and next steps](docs/RISKS-AND-NEXT-STEPS.md)

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
2. Open **SQL Editor → New query**, paste the whole of [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql), and click **Run**.
3. Do the same with the other files in [`supabase/migrations/`](supabase/migrations/), in number order: `0002_rls.sql`, `0003_admin_analytics.sql`, `0004_rate_limits.sql`.
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
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com> → API Keys | **yes — server only** |
| `ANTHROPIC_MODEL` | model id; default `claude-opus-5-5` | no |
| `AI_DAILY_LIMIT` | AI Companion questions per user per 24 h (default 20) | no |
| `CRON_SECRET` | any long random string; protects the weekly insight job | **yes** |

## 3. Seed demo content

```bash
npm run seed
```

This loads Plato's *Republic* (an excerpt from the public-domain Jowett translation, plus an original Chinese summary), the question 「誰應該統治？」 / "Who should rule?", and four placeholder questions. It also registers `ADMIN_EMAILS` as admins. It is safe to run again.

Restart `npm run dev`, then sign in with your email.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on <http://localhost:3000> |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests, including the **unlock-rule tests**, which run the real SQL migrations in an in-memory Postgres (no Supabase needed) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run seed` | Load demo content and admins |

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
- **Limits.** Readers must be signed in, and each gets `AI_DAILY_LIMIT` questions per 24 hours. Only a count is stored (`ai_messages_usage`), never the conversation.
- **Tests:** `tests/ai-guard.test.ts`, with the API mocked.

**AI Insight** groups everyone's reflections into neutral themes and counts how many people hold each view. The counts are computed in code, not by the model. It then recommends 1–2 classics and a next question, and the result is cached in `ai_insights`. Only reflection text is sent to the model, never names or user IDs. It is generated:

- weekly by Vercel Cron ([`vercel.json`](vercel.json) → `/api/cron/insights`), for questions with at least 3 reflections and new ones since the last insight;
- on demand by an admin, using the **Generate AI Insight** button that admins see under the discussion.

To trigger the weekly job by hand locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/insights
```

**Cost note:** the default model is Claude Opus 5.5. The Companion runs at low effort to keep answers fast and cheap. If the budget is tight, set `ANTHROPIC_MODEL=claude-haiku-5-5`. No code change is needed.

## Admin (`/admin`)

Only accounts whose email is in `ADMIN_EMAILS` (applied by `npm run seed`) can open it. Everyone else gets a 404, and the database rejects non-admin writes anyway.

- **Dashboard** shows visitors, readers, reflections, the six funnel rates and progress towards the grant targets (500 reach / 400 finish / 400 reflections / 10% feedback). It also shows average feedback scores and a per-question table with a **Generate AI Insight** button, plus **CSV export** of the summary, raw events and feedback. CSVs open correctly in Excel, Chinese included, and text cells are protected against formula injection.
- **Content** has forms for classics, their excerpts (short, cited excerpts only) and questions: status, featured on the home page, tags and difficulty.
- **Moderation** lists open reports, grouped per post with every reason. You can hide, unhide, delete or dismiss each one, and see a list of hidden content.

Numbers count **distinct people**: a signed-in user, or a signed-out browser's random ID. They're computed by the `admin_analytics()` database function and tested in `tests/analytics.test.ts`.

## Project layout

```
app/[locale]/          pages: home, q/[slug], library, me, admin, privacy, guidelines (zh-HK default, /en)
app/api/ai/companion   AI Companion endpoint
app/api/cron/insights  weekly AI Insight job
app/api/admin/export   CSV export
app/auth/              magic-link callback, sign-out
components/            shared UI; question/ = the 7-step flow; admin/, me/
i18n/                  locales and routing
messages/              all UI strings: zh-HK.json, en.json
lib/actions/           server actions (question flow, profile, admin, insight)
lib/ai/                prompts, guards, Companion, Insight
lib/supabase/          server, browser, service-role and middleware clients
lib/content/           seed content
supabase/migrations/   schema, RLS, analytics, rate limits — run in order
scripts/seed.ts        seed script
tests/                 Vitest (SQL tests run on in-memory Postgres)
docs/                  deployment guide, risks and next steps
```

## Content and copyright

Store only short excerpts and always show source and translator. The English *Republic* text is Benjamin Jowett's 1871 translation (public domain, [Project Gutenberg #1497](https://www.gutenberg.org/ebooks/1497)). The Chinese text is an original summary written for LORE and is labelled 「摘要」. Don't paste modern copyrighted translations.

## Deploying

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**, a step-by-step guide covering GitHub, Supabase (migrations, sign-in URLs, email via Resend), Vercel (environment variables, cron), seeding, a pre-launch checklist and costs.

## Before launch

Read **[docs/RISKS-AND-NEXT-STEPS.md](docs/RISKS-AND-NEXT-STEPS.md)**. The most important items:

- the site has not yet run end to end against real Supabase and a real AI;
- the *Republic* excerpt must be checked word for word;
- sign-in email needs custom SMTP before a launch event;
- check whether you need research ethics approval.
