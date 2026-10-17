# Stage 1 — setup checklist for the human

You do not need to understand the code to do this. Work through the numbered
steps in order, tick the boxes at the end, then reply **"Supabase and keys are
ready"**. Do **not** paste any key into the chat.

The project folder is the cloned `lore` repository. Run every command from
inside it.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> and sign up (free).
2. Click **New project**.
3. Name it `lore` (or anything you like).
4. Choose a region:
   - **Southeast Asia (Singapore)** if your readers are in Hong Kong — lowest latency;
   - **Frankfurt** if your grant partner is in Europe.
5. Set a database password and save it in a password manager. You will not
   need it for this app, but Supabase may ask for it later.
6. Wait 1–2 minutes while the project is provisioned.

> Free projects **pause after 7 days without activity**. That is fine for
> building; restore it from the dashboard if the site stops working.

---

## 2. Copy the three Supabase values

In the Supabase dashboard:

1. Open **Project Settings** (gear icon) → **API** (some projects call it
   **API Keys**).
2. Copy these three values:

| Supabase label | Copy to this variable |
| --- | --- |
| **Project URL** (looks like `https://abcdefgh.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** / **publishable** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** / **secret** key | `SUPABASE_SERVICE_ROLE_KEY` |

The `service_role` key is powerful: it bypasses all database security. Keep it
on the server only. Never put it in a `NEXT_PUBLIC_` variable, a screenshot or
a git commit.

---

## 3. Set the sign-in URLs

In Supabase:

1. **Authentication** → **URL Configuration**.
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs**: add `http://localhost:3000/auth/callback`
4. Save.

When you deploy, add the production URL (for example
`https://lore.vercel.app`) and `https://lore.vercel.app/auth/callback`.

> Magic links are tied to the browser that requested them. If you request the
> link on a laptop and open it on a phone, it will say the link is invalid.
> That is a Supabase security feature, not a bug.

---

## 4. Enable email magic links

1. **Authentication** → **Sign In / Providers** → **Email**.
2. Make sure **Enable Email provider** is on.
3. The app never uses passwords; it only calls `signInWithOtp`, so no password
   settings need changing.

### Customise the email in Traditional Chinese (optional but recommended)

1. **Authentication** → **Emails** → **Magic Link**.
2. Subject:

   ```
   古問 LORE 登入連結
   ```

3. Body (keep `{{ .ConfirmationURL }}` exactly as written):

   ```html
   <h2>古問 LORE</h2>
   <p>你好，</p>
   <p>請按下面的連結登入古問 LORE：</p>
   <p><a href="{{ .ConfirmationURL }}">登入古問 LORE</a></p>
   <p>連結會在 60 分鐘後失效。如果這不是你本人操作，可以忽略這封電郵。</p>
   <p>先讀，再思考，再對話。</p>
   ```

4. Save.

> Supabase's built-in email sender is limited to a few messages per hour. It is
> fine for testing. Before a launch event, add a free SMTP provider such as
> Resend under **Authentication → Emails → SMTP Settings**.

---

## 5. Create the DeepSeek API key

1. Go to <https://platform.deepseek.com> and sign up.
2. Open **API Keys** → **Create new API key**.
3. Copy the key (it starts with `sk-`). You will not be able to see it again.
4. Top up a small amount (US$5 is plenty for testing).
5. If the console offers a monthly spend limit, set one — for example US$10.

Current official details (checked October 2026 at
<https://api-docs.deepseek.com>):

| Setting | Value |
| --- | --- |
| Base URL (OpenAI-compatible) | `https://api.deepseek.com` |
| Chat model | `deepseek-flash` |
| Stronger model | `deepseek-v4-pro` |
| JSON output | `response_format: { "type": "json_object" }` |

The app sends `AI_BASE_URL` without `/chat/completions`.

---

## 6. Create `.env.local`

In the project folder:

```bash
cp .env.example .env.local
```

Open `.env.local` in a text editor and fill it in like this:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=sk-...your-deepseek-key...
AI_MODEL_CHAT=deepseek-flash
AI_MODEL_INSIGHT=deepseek-v4-pro
AI_DAILY_LIMIT_PER_USER=20

ADMIN_EMAILS=you@example.com
CRON_SECRET=some-long-random-string
```

Rules:

- `ADMIN_EMAILS` is comma-separated: `you@example.com,partner@example.com`.
- `CRON_SECRET` can be any long random string. On a Mac/Linux machine:
  `openssl rand -hex 32`. On Windows PowerShell:
  `-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})`.
- Do not add quotes around the values.
- `.env.local` is already in `.gitignore`. Check with `git status` — it should
  not appear.

> The AI routes now use these DeepSeek variables. If `AI_API_KEY` is empty the
> rest of the site still works and the AI panel says "not configured".

---

## 7. Run the database migrations

In Supabase, open **SQL Editor** → **New query**.

**Simplest (recommended):** open

```
supabase/install/lore_all_in_one.sql
```

select all, paste, click **Run**, and wait for "Success". It concatenates all
six migrations in order and is meant for a **new** project.

**If you already ran some of the numbered files**, do not run the one-file
version on top (it would create duplicate tables). Run only the files you have
not run:

| Order | File | What it creates |
| --- | --- | --- |
| 1 | `supabase/migrations/0001_schema.sql` | Tables and indexes |
| 2 | `supabase/migrations/0002_rls.sql` | Profiles trigger, unlock functions, RLS policies, grants |
| 3 | `supabase/migrations/0003_admin_analytics.sql` | Feedback rules and `admin_analytics()` |
| 4 | `supabase/migrations/0004_rate_limits.sql` | Event and report rate limits |
| 5 | `supabase/migrations/0005_stage1_spec_gaps.sql` | `feedback` event type, `response_count`, `ai_usage`, locked count, analytics view |
| 6 | `supabase/migrations/0006_stage2_7.sql` | Nickname onboarding, feed pagination, date-filtered analytics, server-only insights |

If a migration fails, copy the **error message** (not the SQL, not any key) and
send it to me.

---

## 8. Make yourself an admin

You need to do this **after** you have signed in once, because a profile row is
created on first sign-in.

In **SQL Editor**, run this, replacing the email with yours:

```sql
-- 1. Future sign-ups with this email become admins automatically.
insert into public.admin_emails (email)
values ('you@example.com')
on conflict (email) do nothing;

-- 2. Promote the account that already exists.
update public.profiles p
set is_admin = true
from auth.users u
where u.id = p.id
  and lower(u.email) = lower('you@example.com');
```

Also put the same address in `ADMIN_EMAILS` in `.env.local`, so future
`npm run seed` runs keep it in sync.

To check it worked:

```sql
select p.nickname, p.is_admin, u.email
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('you@example.com');
```

`is_admin` should be `true`.

---

## 9. Install dependencies and seed the starter content

In the project folder:

```bash
npm install
npm run seed
npm run setup:check
npm run dev
```

`setup:check` verifies `.env.local`, the Supabase tables, the seeded content and
the DeepSeek key **without printing any secret**. If everything shows ✓, start
the site.

`npm run seed` reads `.env.local`, loads the eight classics and twenty questions,
and registers `ADMIN_EMAILS`. It is safe to run more than once.

Open <http://localhost:3000>. You should see the LORE home page. The library at
<http://localhost:3000/zh-HK/library> should list the starter content. Sign in
with your email, open the link, and check that `/zh-HK/admin` opens.

> Every excerpt has a public-domain Gutenberg source link in `source_note`.
> See the README for the list and the one substitution (Aristotle uses the
> public-domain Ellis translation, because Jowett's was not available in a
> verifiable public-domain file).

---

## 10. Pause here and confirm

Reply with **"Supabase and keys are ready"** when all of these are true. Do not
paste the keys themselves.

- [ ] Supabase project created (Singapore or Frankfurt)
- [ ] Project URL, anon key and service_role key copied into `.env.local`
- [ ] Site URL `http://localhost:3000` and redirect `http://localhost:3000/auth/callback` saved
- [ ] Email provider enabled; magic-link template customised if you want
- [ ] DeepSeek key created, topped up and pasted into `AI_API_KEY`
- [ ] `ADMIN_EMAILS` contains your email
- [ ] Ran `lore_all_in_one.sql` (or the six numbered migrations) with no errors
- [ ] Your account has `is_admin = true`
- [ ] `npm run seed` succeeded and `npm run dev` opens the site
- [ ] You can sign in by email and open `/zh-HK/admin`

Once you confirm, I will start **Stage 2: auth and database wiring** — reading
classics and questions from Supabase, loading profiles, and logging events
against the real database.

---

## Troubleshooting

**"Invalid login credentials" / no email arrives**
Check Supabase → Authentication → Logs. The built-in sender may be rate-limited;
wait an hour or add SMTP. Check spam.

**Magic link says expired or invalid**
Open it in the same browser where you requested it, within 60 minutes.

**`npm run seed` says relation "classics" does not exist**
The migrations have not run, or ran in the wrong order. Start again at step 7.

**`/admin` returns 404**
Your profile is not an admin yet. Run the SQL in step 8 while signed in, then
refresh. Sign out and back in if needed.

**The site loads but shows "示範模式" (demo mode)**
`NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing or
empty in `.env.local`. Restart `npm run dev` after editing it.

**The AI panel says "not configured"**
Expected until Stage 4. Supabase sign-in, reading, reflections and discussion
still work without it.
