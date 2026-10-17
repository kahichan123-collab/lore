import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Change the model with ANTHROPIC_MODEL in .env.local — no code change needed. */
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
export const AI_DAILY_LIMIT = Math.max(1, Number(process.env.AI_DAILY_LIMIT) || 20);
export const isAiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/**
 * Some models' safety classifiers can occasionally decline a harmless
 * request. On models that support it, `fallbacks: "default"` lets the API
 * retry on a fallback model automatically instead of returning a refusal.
 */
export function fallbackParams(model: string) {
  return /^claude-(opus-5|fable-5|sonnet-5-5)/.test(model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
    : {};
}
