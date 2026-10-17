// Shared between the AI API routes and the browser.
import type { InsightSummary } from "./insight-summary";

/** The newest row of `ai_insights` for a question. */
export interface StoredInsight {
  summary: InsightSummary;
  generatedAt: string;
}

export type CompanionError = "notConfigured" | "signIn" | "invalid" | "empty" | "limit" | "refused" | "busy" | "failed";

export type CompanionResponse = { answer: string; remaining: number } | { error: CompanionError; remaining?: number };

export type InsightError = "notConfigured" | "forbidden" | "notEnough" | "refused" | "failed";

/** Fewest submitted reflections before an AI Insight is generated. */
export const MIN_REFLECTIONS_FOR_INSIGHT = 3;
