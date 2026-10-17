import "server-only";
import type OpenAI from "openai";
import type { Locale } from "@/i18n/routing";
import { AI_MODEL_CHAT, ai } from "./client";
import { givesConclusion, guidingReply } from "./guard";
import { companionSystemPrompt, companionUserMessage, type QuestionContext } from "./prompts";

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

export type CompanionResult = { kind: "answer"; text: string } | { kind: "refused" };

/** Earlier turns, kept only if they alternate user/assistant as the API requires. */
function historyMessages(history: Turn[]): OpenAI.Chat.ChatCompletionMessageParam[] {
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
  const response = await ai().chat.completions.create({
    model: AI_MODEL_CHAT,
    max_tokens: 800,
    temperature: 0.3,
    // Explanations don't need chain-of-thought; this keeps answers fast and cheap.
    reasoning_effort: "none",
    messages: [
      { role: "system", content: companionSystemPrompt(input.context, input.locale) },
      ...historyMessages(input.history),
      { role: "user", content: companionUserMessage(input.question, input.quote) },
    ],
  });

  const text = (response.choices[0]?.message?.content ?? "").trim();
  if (!text) return { kind: "refused" };

  if (givesConclusion(text)) {
    console.warn("AI Companion answer replaced: it appeared to give a conclusion.");
    return { kind: "answer", text: guidingReply(input.locale) };
  }
  return { kind: "answer", text };
}
