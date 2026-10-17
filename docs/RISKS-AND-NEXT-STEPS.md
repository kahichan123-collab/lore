# Remaining risks and next steps

Status at the end of the MVP build (October 2026).

## What has been verified

- **Unlock rule:** you can't see others' reflections, comments, likes or the AI Insight until you've submitted. This is enforced in the database and tested by running the real migrations in an in-memory Postgres, as signed-out, locked, draft-only, unlocked and admin users. It holds even when someone calls the API directly.
- **AI guardrails:**
  - the system prompt contains every rule;
  - 14 verdict-seeking questions (English and Cantonese) are intercepted, and 8 ordinary comprehension questions get through;
  - when a mocked model answer slips into a conclusion, it is replaced.
- **Rate limits and analytics:** limits for comments, reports and analytics events; analytics counts each person once; CSV export is protected against spreadsheet-formula injection.
- **Checks:** 76 automated tests. TypeScript, lint and the production build pass. No known vulnerabilities in production dependencies.
- **Accessibility:** zero automated (axe-core) violations on every page and every demo step of the question flow, in both languages, on desktop and phone. Keyboard skip link works.

## Risks, most important first

### 1. Never run against real Supabase and a real AI

Everything was built and tested without live keys. The database rules are tested on real Postgres, and the pages in demo mode, but the full path has not run end to end: sign-in email → submit → unlock → discuss → AI answer → AI Insight.

**Action:** run the checklist in [DEPLOYMENT.md §6](DEPLOYMENT.md#6-check-it-works-do-this-before-telling-anyone-the-url) before any pilot.

### 2. The seed text must be checked word for word

The English *Republic* excerpt (Jowett, Book VI 488a–489a) was entered from memory, not copied from the source.

**Action:** compare it with [Project Gutenberg #1497](https://www.gutenberg.org/ebooks/1497) and correct it in **Admin → Content**.

### 3. Sign-in emails

- **Volume:** Supabase's built-in sender handles only a few emails per hour. Custom SMTP (Resend) is required before a launch event.
- **University filtering:** university mail servers sometimes delay or quarantine sign-in links. Test with real `@link.cuhk.edu.hk` addresses.
- **Same browser:** the link must be opened in the browser where it was requested; a security feature (PKCE) ties it to that browser. A student who requests on a laptop and taps the link on their phone will see "link invalid".

**Possible fix:** add a 6-digit code option, which Supabase supports, so students can type the code instead.

### 4. AI behaviour and cost

- **Guardrails reduce the risk; they don't remove it.** The guards are keyword-based. A persistent student can still nudge the model towards an opinion, for example through role-play over several turns. The earlier turns in a conversation are sent from the browser, so a technical user could also fake them.
- **Pre-launch test:** before the pilot, spend 30 minutes trying to make it give a verdict, in Cantonese, written Chinese and English, and note anything that gets through.
- **Cost:** the default model is Claude Opus 5.5. Each user is capped at 20 questions a day, but there is no overall cap. **Set a monthly spend limit in the Anthropic Console.** Switch to `claude-haiku-5-5` if the budget is tight.
- **AI Insight timing:** a large Insight may take more than a minute. If Vercel's Hobby plan stops it partway, it fails and nothing is saved. Try again with fewer reflections, use the cheaper model, or upgrade the plan.
- **Data sharing:** reflection text (never names) is sent to Anthropic for the Insight, and the privacy page says so. Check that this is acceptable to your grant body or university.

### 5. Research ethics and privacy law

If the feedback, analytics or reflections will be used in a grant report or publication, you may need ethics approval from your university. Participants may also need to give informed consent beyond the privacy page. The site also handles personal data of Hong Kong residents, which falls under the PDPO.

**Action:** ask your supervisor or the CUHK research ethics office **before** the pilot, not after.

### 6. Moderation depends on people

- **Profanity filter:** the list is deliberately small, and Cantonese slang changes quickly.
- **No alerts:** there's no notification when something is reported, so someone must check **Admin → Moderation** regularly, ideally daily during the pilot.
- **No audit log:** moderation actions aren't recorded, so you can't see who hid or deleted what.

### 7. Free-tier limits

- **Supabase pausing:** a free Supabase project **pauses after 7 days without activity**, for example over a holiday. The site then shows the error page until someone restores it from the Supabase dashboard.
- **No backups:** free Supabase has no downloadable backups. Export the CSVs after each milestone. For the full database, use `pg_dump` (see Supabase docs → Backups).

### 8. Analytics accuracy

- **Visitors:** signed-out visitors are counted per browser, so the same person on a phone and a laptop counts twice. Clearing cookies also counts as a new visitor.
- **Inflated counts:** an analytics event from one person is capped at 120 per hour, which stops spam inflating the numbers. A determined person could still add fake signed-out visitors.
- **Definitions:**
  - **Reflections:** one reflection per question, so a person who answers two questions counts twice.
  - **Unlock rate:** people who unlocked ÷ people who opened the text.

  Check these match your grant proposal.

### 9. Accessibility

Automated checks catch only part of the problems a person would.

**Action:** before launch, do one pass with a screen reader (VoiceOver on iPhone and NVDA on Windows), and watch two or three students use the site without help.

### 10. Technical debt

- **Next.js 15:** the site stays on Next.js 15, with one dependency (PostCSS) pinned to a patched version. Plan an upgrade to Next.js 16 after the pilot.
- **No CSP:** there is no Content-Security-Policy header yet. React already escapes all user text, but a CSP would add a second layer.
- **No browser tests in CI:** there are no browser end-to-end tests in continuous integration. The tests run locally with `npm test`.

## Suggested next steps

**Before a pilot**

1. Connect Supabase (production project) and the Anthropic key. Run the [deployment checklist](DEPLOYMENT.md#6-check-it-works-do-this-before-telling-anyone-the-url).
2. Verify the *Republic* excerpt against Gutenberg.
3. Set up Resend SMTP. Test sign-in with three or more CUHK email addresses and on phones.
4. Try to break the AI guardrails (see risk 4), and set the Anthropic spend limit.
5. Confirm the ethics and consent requirements (see risk 5).

**Pilot (10–20 students)**

6. Watch a few students use it. Note where they get stuck, especially sign-in and the step order.
7. Read every AI Companion answer students mention, and adjust `lib/ai/prompts.ts` if it drifts.
8. Write excerpts for the four placeholder questions: majority rule, AI and thinking, unjust law, goodness and happiness. Public-domain candidates include Mill's *On Liberty*, Plato's *Crito* and Aristotle's *Nicomachean Ethics*.

**After the pilot**

9. Add a 6-digit sign-in code, an email alert for new reports, and a moderation log.
10. Add Playwright end-to-end tests and run all tests on GitHub Actions for every push.
11. Upgrade to Next.js 16 and add a Content-Security-Policy.
