import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_MODEL, anthropic, fallbackParams, isAiConfigured } from "./client";
import { loadQuestionContext } from "./context";
import { InsightOutputSchema, buildInsightSummary } from "./insight-summary";
import { INSIGHT_SYSTEM_PROMPT, insightUserMessage } from "./prompts";
import { MIN_REFLECTIONS_FOR_INSIGHT, type InsightError } from "./types";

const MAX_REFLECTIONS = 300;

/**
 * Summarises a question's published reflections into neutral themes and
 * caches the result in `ai_insights`. Runs with the service-role key because
 * it reads everyone's reflections; only reflection text is sent to the model,
 * never names or user ids.
 */
export async function generateInsight(questionId: string): Promise<{ ok: true } | { ok: false; error: InsightError }> {
  if (!isAiConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "notConfigured" };

  const db = createAdminClient();
  const context = await loadQuestionContext(db, questionId);
  if (!context) return { ok: false, error: "failed" };

  const { data: rows, error } = await db
    .from("reflections")
    .select("body")
    .eq("question_id", questionId)
    .eq("status", "published")
    .order("submitted_at", { ascending: false })
    .limit(MAX_REFLECTIONS);
  if (error) {
    console.error("Insight: could not load reflections:", error.message);
    return { ok: false, error: "failed" };
  }
  const reflections = (rows ?? []).map((r) => r.body as string);
  if (reflections.length < MIN_REFLECTIONS_FOR_INSIGHT) return { ok: false, error: "notEnough" };

  try {
    const response = await anthropic().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(InsightOutputSchema) },
      system: INSIGHT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: insightUserMessage(context, reflections) }],
      ...fallbackParams(AI_MODEL),
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "refused" };
    if (!response.parsed_output) {
      console.error("Insight: model output did not match the schema; stop_reason =", response.stop_reason);
      return { ok: false, error: "failed" };
    }

    const summary = buildInsightSummary(response.parsed_output, reflections.length, response.model);
    const { error: insertError } = await db.from("ai_insights").insert({ question_id: questionId, summary_json: summary });
    if (insertError) {
      console.error("Insight: could not save:", insertError.message);
      return { ok: false, error: "failed" };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`Insight: Anthropic API error ${err.status}:`, err.message);
    else console.error("Insight failed:", err);
    return { ok: false, error: "failed" };
  }
}

/**
 * For the scheduled job: questions with enough reflections and at least one
 * new reflection since their last insight.
 */
export async function questionsNeedingInsight(): Promise<string[]> {
  const db = createAdminClient();
  const [{ data: reflections }, { data: insights }] = await Promise.all([
    db.from("reflections").select("question_id, submitted_at").eq("status", "published"),
    db.from("ai_insights").select("question_id, generated_at"),
  ]);

  const lastInsight = new Map<string, string>();
  for (const i of insights ?? []) {
    if (!lastInsight.has(i.question_id) || i.generated_at > lastInsight.get(i.question_id)!) lastInsight.set(i.question_id, i.generated_at);
  }
  const stats = new Map<string, { count: number; newest: string }>();
  for (const r of reflections ?? []) {
    const s = stats.get(r.question_id) ?? { count: 0, newest: "" };
    s.count += 1;
    if (r.submitted_at > s.newest) s.newest = r.submitted_at;
    stats.set(r.question_id, s);
  }

  return [...stats]
    .filter(([id, s]) => s.count >= MIN_REFLECTIONS_FOR_INSIGHT && (!lastInsight.has(id) || s.newest > lastInsight.get(id)!))
    .map(([id]) => id);
}
