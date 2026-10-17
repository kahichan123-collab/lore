// The AI Insight's strict JSON shape, parsing and summary building.
//
// DeepSeek's JSON mode guarantees valid JSON but does not enforce a schema,
// so the output is validated here with Zod and the route retries once if it
// does not match. Counts are computed from the reflection numbers the model
// assigned; the model's `approx_share` is only a fallback.

import { z } from "zod";

const Bilingual = z.object({ zh: z.string().min(1), en: z.string().min(1) });

export const InsightOutputSchema = z.object({
  themes: z
    .array(
      z.object({
        title: Bilingual,
        summary: Bilingual,
        // Which <reflection number="N"> blocks belong to this theme.
        reflection_numbers: z.array(z.number().int()).max(500),
        // The model's estimate, used only if it returns no valid numbers.
        approx_share: z.number().min(0).max(100),
      }),
    )
    .min(1)
    .max(6),
  tensions: z.array(Bilingual).max(6),
  related_classics: z
    .array(
      z.object({
        title: Bilingual,
        author: Bilingual,
        why: Bilingual,
      }),
    )
    .max(3),
  next_question: Bilingual,
});

export type InsightOutput = z.infer<typeof InsightOutputSchema>;
type BilingualText = z.infer<typeof Bilingual>;

export interface InsightSummary {
  version: 2;
  total: number;
  themes: { title: BilingualText; summary: BilingualText; count: number }[];
  tensions?: BilingualText[];
  recommended_classics: InsightOutput["related_classics"];
  next_question: BilingualText;
  model: string;
}

export const MAX_THEMES = 5;
export const MAX_RECOMMENDATIONS = 2;

/** Parse the raw model content. Returns null for invalid or non-JSON output. */
export function parseInsightJson(text: string): InsightOutput | null {
  try {
    const parsed: unknown = JSON.parse(text);
    const result = InsightOutputSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function buildInsightSummary(output: InsightOutput, total: number, model: string): InsightSummary {
  const seen = new Set<number>();
  let themes = output.themes.map((theme) => {
    // Each reflection counts once, in the first theme that claims it.
    const mine = theme.reflection_numbers.filter((n) => n >= 1 && n <= total && !seen.has(n));
    mine.forEach((n) => seen.add(n));
    return { title: theme.title, summary: theme.summary, count: mine.length, approxShare: theme.approx_share };
  });

  // A model that ignored the numbering instruction still gives a usable
  // summary: fall back to its approximate shares, capped at the real total.
  if (themes.every((theme) => theme.count === 0) && total > 0) {
    themes = themes.map((theme) => ({
      ...theme,
      count: Math.round((theme.approxShare / 100) * total),
    }));
  }

  const cleaned = themes
    .filter((theme) => theme.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_THEMES)
    .map(({ title, summary, count }) => ({ title, summary, count }));

  return {
    version: 2,
    total,
    themes: cleaned,
    tensions: output.tensions,
    recommended_classics: output.related_classics.slice(0, MAX_RECOMMENDATIONS),
    next_question: output.next_question,
    model,
  };
}
