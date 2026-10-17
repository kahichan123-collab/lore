import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { isAiConfigured } from "@/lib/ai/client";
import { askCompanion } from "@/lib/ai/companion";
import { loadQuestionContext } from "@/lib/ai/context";
import { guidingReply, seeksConclusion } from "@/lib/ai/guard";
import type { CompanionResponse } from "@/lib/ai/types";
import { remainingAiQuestions } from "@/lib/ai/usage";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { cleanText } from "@/lib/text";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  questionId: z.uuid(),
  locale: z.enum(routing.locales),
  question: z.string().max(500),
  quote: z.string().max(600).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1500) }))
    .max(8)
    .default([]),
});

const reply = (body: CompanionResponse, status = 200) => NextResponse.json(body, { status });

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !isAiConfigured) return reply({ error: "notConfigured" }, 503);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ error: "invalid" }, 400);
  const { questionId, locale, history } = parsed.data;
  const question = cleanText(parsed.data.question);
  const quote = parsed.data.quote ? cleanText(parsed.data.quote) : undefined;
  if (!question && !quote) return reply({ error: "empty" }, 400);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply({ error: "signIn" }, 401);

  let remaining = await remainingAiQuestions(supabase, user.id);

  // Asking for a verdict: answer with a guiding question, without calling the model.
  if (seeksConclusion(question)) return reply({ answer: guidingReply(locale), remaining });

  if (remaining <= 0) return reply({ error: "limit", remaining: 0 }, 429);

  const context = await loadQuestionContext(supabase, questionId);
  if (!context) return reply({ error: "invalid" }, 404);

  // Count the call before making it, so parallel requests can't slip past the limit.
  const { error: usageError } = await supabase.from("ai_messages_usage").insert({ user_id: user.id, question_id: questionId });
  if (usageError) {
    console.error("Could not log AI usage:", usageError.message);
    return reply({ error: "failed" }, 500);
  }
  remaining -= 1;
  await supabase.from("events").insert({ user_id: user.id, question_id: questionId, type: "ask_ai" });

  try {
    const result = await askCompanion({ context, locale, question, quote, history });
    if (result.kind === "refused") return reply({ error: "refused", remaining });
    return reply({ answer: result.text, remaining });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
      return reply({ error: "busy", remaining }, 503);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
    } else {
      console.error("AI Companion failed:", error);
    }
    return reply({ error: "failed", remaining }, 502);
  }
}
