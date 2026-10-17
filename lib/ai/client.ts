import "server-only";
import OpenAI from "openai";

/**
 * DeepSeek exposes an OpenAI-compatible Chat Completions API. The official
 * docs (October 2026) give:
 *   base URL  https://api.deepseek.com
 *   models    deepseek-flash | deepseek-v4-pro
 * Everything provider-specific comes from the environment so the app can be
 * pointed at another OpenAI-compatible provider later.
 */
export const AI_BASE_URL = (process.env.AI_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
export const AI_MODEL_CHAT = process.env.AI_MODEL_CHAT || "deepseek-flash";
export const AI_MODEL_INSIGHT = process.env.AI_MODEL_INSIGHT || "deepseek-v4-pro";

/** Questions per reader per 24 hours. */
export const AI_DAILY_LIMIT = Math.max(
  1,
  Number(process.env.AI_DAILY_LIMIT_PER_USER) || Number(process.env.AI_DAILY_LIMIT) || 20,
);

export const isAiConfigured = Boolean(process.env.AI_API_KEY);

let client: OpenAI | null = null;

/** Server-only DeepSeek client. Throws if AI_API_KEY is missing. */
export function ai(): OpenAI {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY is not set");
  client ??= new OpenAI({
    apiKey,
    baseURL: AI_BASE_URL,
    timeout: 60_000,
    maxRetries: 1,
  });
  return client;
}
