// Turns the model's structured output into what we store and show. Counts
// are computed here from the reflection numbers the model assigned — not
// taken from the model — so "how many readers hold each view" is exact.

import { z } from "zod";

const Bilingual = z.object({ zh: z.string(), en: z.string() });

// Kept free of min/max constraints, which structured outputs may not accept;
// limits are applied in buildInsightSummary instead.
export const InsightOutputSchema = z.object({
  themes: z.array(
    z.object({
      title: Bilingual,
      summary: Bilingual,
      reflection_numbers: z.array(z.number().int()),
    }),
  ),
  recommended_classics: z.array(
    z.object({
      title: Bilingual,
      author: Bilingual,
      why: Bilingual,
    }),
  ),
  next_question: Bilingual,
});

export type InsightOutput = z.infer<typeof InsightOutputSchema>;
type BilingualText = z.infer<typeof Bilingual>;

export interface InsightSummary {
  version: 1;
  total: number;
  themes: { title: BilingualText; summary: BilingualText; count: number }[];
  recommended_classics: InsightOutput["recommended_classics"];
  next_question: BilingualText;
  model: string;
}

export const MAX_THEMES = 5;
export const MAX_RECOMMENDATIONS = 2;

export function buildInsightSummary(output: InsightOutput, total: number, model: string): InsightSummary {
  const seen = new Set<number>();
  const themes = output.themes
    .map((theme) => {
      // Each reflection counts once, in the first theme that claims it.
      const mine = theme.reflection_numbers.filter((n) => n >= 1 && n <= total && !seen.has(n));
      mine.forEach((n) => seen.add(n));
      return { title: theme.title, summary: theme.summary, count: mine.length };
    })
    .filter((theme) => theme.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_THEMES);

  return {
    version: 1,
    total,
    themes,
    recommended_classics: output.recommended_classics.slice(0, MAX_RECOMMENDATIONS),
    next_question: output.next_question,
    model,
  };
}
