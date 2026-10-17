import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Locale } from "@/i18n/routing";
import { AI_MODEL, anthropic, fallbackParams } from "./client";
import { givesConclusion, guidingReply } from "./guard";
import { companionSystemPrompt, companionUserMessage, type QuestionContext } from "./prompts";

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

export type CompanionResult = { kind: "answer"; text: string } | { kind: "refused" };

/** Earlier turns, kept only if they alternate user/assistant as the API requires. */
function historyMessages(history: Turn[]): Anthropic.Beta.BetaMessageParam[] {
  const turns = history.slice(-6);
  while (turns[0]?.role === "assistant") turns.shift();
  if (turns.length % 2 !== 0 || turns.some((t, i) => t.role !== (i % 2 === 0 ? "user" : "assistant"))) return [];
  return turns.map((t) => ({
    role: t.role,
    content: t.role === "user" ? companionUserMessage(t.text) : t.text,
  }));
}

export async function askCompanion(input: {
  context: QuestionContext;
  locale: Locale;
  question: string;
  quote?: string;
  history: Turn[];
}): Promise<CompanionResult> {
  const response = await anthropic().beta.messages.create({
    model: AI_MODEL,
    max_tokens: 8000,
    // Short explanations don't need deep reasoning; low effort keeps cost and latency down.
    output_config: { effort: "low" },
    system: companionSystemPrompt(input.context, input.locale),
    messages: [
      ...historyMessages(input.history),
      { role: "user", content: companionUserMessage(input.question, input.quote) },
    ],
    ...fallbackParams(AI_MODEL),
  });

  if (response.stop_reason === "refusal") return { kind: "refused" };

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  if (!text) return { kind: "refused" };

  if (givesConclusion(text)) {
    console.warn("AI Companion answer replaced: it appeared to give a conclusion.");
    return { kind: "answer", text: guidingReply(input.locale) };
  }
  return { kind: "answer", text };
}
