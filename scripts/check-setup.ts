// Setup checker: verifies .env.local, Supabase connectivity and the DeepSeek
// key WITHOUT printing any secret. Run after the migrations and seed:
//   npm run setup:check
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AI_BASE_URL",
  "AI_API_KEY",
  "AI_MODEL_CHAT",
  "AI_MODEL_INSIGHT",
  "ADMIN_EMAILS",
  "CRON_SECRET",
] as const;

let failed = false;
for (const name of required) {
  const value = process.env[name];
  console.log(`${value ? "✓" : "✗"} ${name}${value ? "" : " is missing"}`);
  if (!value) failed = true;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const db = createClient(url, anon, { auth: { persistSession: false } });
    const [classics, questions] = await Promise.all([
      db.from("classics").select("id", { count: "exact" }).limit(1),
      db.from("questions").select("id", { count: "exact" }).eq("status", "published").limit(1),
    ]);
    if (classics.error) {
      console.log(`✗ Supabase read failed: ${classics.error.message}`);
      failed = true;
    } else {
      console.log(`✓ Supabase connected: ${classics.count ?? 0} classics`);
    }
    if (questions.error) {
      console.log(`✗ Questions read failed: ${questions.error.message}`);
      failed = true;
    } else {
      console.log(`✓ Published questions: ${questions.count ?? 0}`);
    }
  }

  const aiKey = process.env.AI_API_KEY;
  const aiBase = (process.env.AI_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  if (aiKey) {
    try {
      const response = await fetch(`${aiBase}/models`, { headers: { Authorization: `Bearer ${aiKey}` } });
      if (response.ok) {
        const body = (await response.json()) as { data?: { id?: string }[] };
        console.log(`✓ DeepSeek key accepted; models: ${(body.data ?? []).map((m) => m.id).filter(Boolean).join(", ") || "(none listed)"}`);
      } else {
        console.log(`✗ DeepSeek key check failed: HTTP ${response.status}`);
        failed = true;
      }
    } catch (error) {
      console.log(`✗ Could not reach DeepSeek: ${error instanceof Error ? error.message : "unknown error"}`);
      failed = true;
    }
  }

  if (failed) {
    console.log("\nSome checks failed. See docs/STAGE-1-CHECKLIST.zh-CN.md (Chinese) or docs/DEPLOYMENT.md.");
    process.exit(1);
  }
  console.log("\nAll checks passed. Start the site with: npm run dev");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
