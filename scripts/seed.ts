// Loads demo content into Supabase and registers admin emails.
// Usage: npm run seed   (reads .env.local; safe to run more than once)
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SEED_CLASSICS, SEED_EXCERPTS, SEED_QUESTIONS } from "../lib/content/seed-data";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

function check<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

async function main() {
  const classics = check(
    await db.from("classics").upsert([...SEED_CLASSICS], { onConflict: "slug" }).select("id, slug"),
    "classics",
  );
  const classicId = new Map(classics.map((c) => [c.slug, c.id as string]));
  console.log(`✓ ${classics.length} classic(s)`);

  const excerptIdByClassic = new Map<string, string>();
  for (const { classic_slug, ...excerpt } of SEED_EXCERPTS) {
    const classic_id = classicId.get(classic_slug)!;
    const existing = check<{ id: string } | null>(
      await db.from("excerpts").select("id").eq("classic_id", classic_id).eq("source_note", excerpt.source_note).maybeSingle(),
      "find excerpt",
    );
    const row = check<{ id: string }>(
      existing
        ? await db.from("excerpts").update({ ...excerpt, classic_id }).eq("id", existing.id).select("id").single()
        : await db.from("excerpts").insert({ ...excerpt, classic_id }).select("id").single(),
      "excerpt",
    );
    excerptIdByClassic.set(classic_slug, row.id);
  }
  console.log(`✓ ${SEED_EXCERPTS.length} excerpt(s)`);

  const questions = SEED_QUESTIONS.map(({ excerpt_classic_slug, ...q }) => ({
    ...q,
    excerpt_id: excerpt_classic_slug ? excerptIdByClassic.get(excerpt_classic_slug)! : null,
    status: "published",
  }));
  check(await db.from("questions").upsert(questions, { onConflict: "slug" }), "questions");
  console.log(`✓ ${questions.length} question(s)`);

  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length) {
    check(await db.from("admin_emails").upsert(admins.map((email) => ({ email }))), "admin_emails");
    // Promote admins who signed up before being listed.
    const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
    const ids = (users?.users ?? []).filter((u) => u.email && admins.includes(u.email.toLowerCase())).map((u) => u.id);
    if (ids.length) check(await db.from("profiles").update({ is_admin: true }).in("id", ids), "promote admins");
    console.log(`✓ ${admins.length} admin email(s), ${ids.length} existing account(s) promoted`);
  } else {
    console.log("· ADMIN_EMAILS is empty — no admins registered");
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
