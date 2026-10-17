# Deploying 古問 LORE (Vercel + Supabase)

This guide takes the site from your computer to a public URL. Everything below fits in free tiers except the DeepSeek API, which is pay-as-you-go (see [Costs](#costs)).

This guide takes the site from your computer to a public URL. Everything below fits in free tiers except the DeepSeek API, which is pay-as-you-go (see [Costs](#costs)).

**Time needed:** about 45 minutes the first time.

**You need accounts at:** GitHub, Vercel (sign up with GitHub), Supabase, DeepSeek Platform, and optionally Resend for email.

---

## 1. Put the code on GitHub

Vercel deploys from a Git repository. In the `lore` folder:

```bash
git init
git add .
git commit -m "古問 LORE MVP"
```

Create an **empty private repository** on GitHub, for example `lore`. Then:

```bash
git remote add origin https://github.com/<your-username>/lore.git
git branch -M main
git push -u origin main
```

`.env.local` is in `.gitignore`, so your keys are never uploaded. Check with `git status` before pushing anyway.

## 2. Set up the production database (Supabase)

You can use the same Supabase project you used for local testing, or create a separate one for production. A separate project is cleaner because test data stays out of your grant numbers.

1. **Create the project.** At <https://supabase.com>, choose **New project**, pick the Singapore region (closest to Hong Kong) and save the database password somewhere safe.
2. **Run the database.** Go to **SQL Editor → New query**, paste the whole of `supabase/install/lore_all_in_one.sql`, and click **Run**. This is the six migrations below, concatenated for a fresh project. If you prefer them separately, run `0001_schema.sql` → `0002_rls.sql` → `0003_admin_analytics.sql` → `0004_rate_limits.sql` → `0005_stage1_spec_gaps.sql` → `0006_stage2_7.sql`, but never both approaches on one project.
3. **Set the sign-in URLs.** Go to **Authentication → URL Configuration**. You'll fill these in after step 3, once you know your Vercel URL.
   - **Site URL:** `https://<your-site>.vercel.app`
   - **Redirect URLs:** add `https://<your-site>.vercel.app/auth/callback`. Keep `http://localhost:3000/auth/callback` if you still develop locally.
4. **Set up email (important before launch).** Supabase's built-in email sends only a few messages per hour, so at a launch event most students won't receive their sign-in link.
   1. Sign up at <https://resend.com> (free: 3,000 emails/month) and verify a domain you own. Without a domain you can only send to your own address.
   2. In Supabase, go to **Authentication → Emails → SMTP Settings** and turn on custom SMTP with Resend's details: host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key.
   3. Optionally, edit the **Magic Link** email template to say 古問 LORE in both languages.
5. **Copy the keys.** Go to **Project Settings → API**. You need the Project URL, the `anon`/publishable key and the `service_role`/secret key.

## 3. Deploy on Vercel

1. At <https://vercel.com/new>, import your GitHub repository. Vercel detects Next.js; leave the build settings as they are.
2. Before clicking **Deploy**, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase `anon` / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` / secret key |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-site>.vercel.app` (or your custom domain) |
   | `ADMIN_EMAILS` | `pingheichoi123@gmail.com` (comma-separate more) |
   | `AI_BASE_URL` | `https://api.deepseek.com` |
   | `AI_API_KEY` | from <https://platform.deepseek.com/api_keys> |
   | `AI_MODEL_CHAT` | `deepseek-flash` |
   | `AI_MODEL_INSIGHT` | `deepseek-v4-pro`, or `deepseek-flash` to save money |
   | `AI_DAILY_LIMIT_PER_USER` | `20` |
   | `CRON_SECRET` | a long random string (e.g. from a password generator) |

3. Click **Deploy**. When it finishes, copy the URL, then go back to step 2.3 and fill in the Supabase URL settings.
4. If you changed `NEXT_PUBLIC_SITE_URL` after the first deploy, redeploy: **Deployments → ⋯ → Redeploy**. `NEXT_PUBLIC_` values are fixed at build time.

## 4. Load content and make yourself admin

On your computer, point `.env.local` at the **production** Supabase project (same URL and keys as above), then run:

```bash
npm run seed
```

This loads the eight classics and twenty questions and registers `ADMIN_EMAILS` as admins. It's safe to run again; if you've already signed up, it promotes your existing account.

## 5. Weekly AI Insight job

[`vercel.json`](../vercel.json) already schedules `/api/cron/insights` for Sundays at 20:00 UTC (Monday 04:00 Hong Kong time). Vercel registers it automatically on deploy and sends `CRON_SECRET` with each run. You can see the runs under **Project → Settings → Cron Jobs**.

You can also generate an insight at any time from **Admin → Dashboard → Generate**.

## 6. Check it works (do this before telling anyone the URL)

Use two different email addresses, A and B, ideally including a CUHK address:

- [ ] **Sign-in:** A signs in, the email arrives within a minute, and the link signs A in.
- [ ] **Locked view:** A opens 「誰應該統治？」, writes a first thought, reads the text and asks the AI Companion "What does *prater* mean?". The answer is short and explains the word.
- [ ] **Verdict refused:** A asks the AI 「正確答案是甚麼？」. It declines and asks a guiding question.
- [ ] **Unlock:** A submits a reflection and sees the unlocked section with only their own reflection.
- [ ] **Discussion:** B does the same and sees A's reflection. B replies, likes and reports A's reflection.
- [ ] **Moderation:** as admin, open **Admin → Moderation** and hide the reported reflection. It disappears from B's view.
- [ ] **AI Insight:** after 5 reflections, click **Generate AI Insight**. The themes, tensions and counts look sensible.
- [ ] **Analytics:** **Admin → Dashboard** shows non-zero numbers, and the CSV downloads open in Excel with the Chinese readable.
- [ ] **Phone:** open the site on a phone, switch language and go through the flow again.
- [ ] **A third, new account (C) sees nothing:** before submitting, C sees no one else's reflections, replies or Insight on that question. This is enforced by the database, not just hidden in the page. `tests/unlock-rls.test.ts` proves it, including for direct database calls.

## 7. Custom domain (optional)

In Vercel, go to **Project → Settings → Domains → Add**. Follow the DNS instructions, then update `NEXT_PUBLIC_SITE_URL`, the Supabase Site URL and the Redirect URLs, and redeploy.

## Updating the site later

- **Code changes:** `git push` to `main`, and Vercel redeploys automatically.
- **Database changes:** a new file in `supabase/migrations/` must be run by hand in the Supabase SQL Editor, in number order, before deploying code that needs it.
- **Content:** use **Admin → Content**. No deploy is needed.

## Costs

| Service | Free tier | Watch out for |
| --- | --- | --- |
| Vercel Hobby | Enough for this project | Hobby is for non-commercial use. Function time limits apply to AI Insight (see risks). |
| Supabase Free | 500 MB database, 50k monthly users | **Pauses after 7 days with no activity.** Restore it from the dashboard. Free tier has no downloadable backups. |
| Resend Free | 3,000 emails/month | Needs a verified domain |
| DeepSeek API | Pay as you go | See below |

**Rough DeepSeek estimate.** Each AI Companion question sends the rules and the excerpt (roughly 1,000–2,000 input tokens) and gets back a short answer.

- **`deepseek-flash`** (default chat): about **US$0.0005–0.002 per question**. 400 students × 5 questions is roughly **US$1–4**.
- **`deepseek-v4-pro`** (default Insight): a few cents per Insight, depending on the number of reflections.

Check current prices at <https://api-docs.deepseek.com/quick_start/pricing>. These are estimates; check real usage in the DeepSeek console after the pilot.

**Set a monthly spend limit in the DeepSeek console.** The per-user daily cap stops one person from overspending, but not a large crowd.
