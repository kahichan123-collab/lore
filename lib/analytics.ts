// Funnel maths for the admin dashboard and CSV export. Raw counts come from
// the `admin_analytics()` database function.

export interface AnalyticsRow {
  question_id: string | null;
  visitors: number;
  opened_text: number;
  finished_text: number;
  asked_ai: number;
  reflected: number;
  unlocked: number;
  commented: number;
  feedback_count: number;
  avg_rating: number | null;
  avg_ai_helped: number | null;
  avg_own_view: number | null;
}

const COUNTS = ["visitors", "opened_text", "finished_text", "asked_ai", "reflected", "unlocked", "commented", "feedback_count"] as const;
const AVERAGES = ["avg_rating", "avg_ai_helped", "avg_own_view"] as const;

/** Postgres bigint/numeric arrive as strings; make them numbers. */
export function normalizeRow(raw: Record<string, unknown>): AnalyticsRow {
  const row = { question_id: (raw.question_id as string | null) ?? null } as AnalyticsRow;
  for (const key of COUNTS) row[key] = Number(raw[key] ?? 0);
  for (const key of AVERAGES) row[key] = raw[key] === null || raw[key] === undefined ? null : Number(raw[key]);
  return row;
}

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

export const RATE_KEYS = ["completion", "aiUsage", "reflection", "unlock", "discussion", "feedback"] as const;
export type RateKey = (typeof RATE_KEYS)[number];

export function rates(r: AnalyticsRow): Record<RateKey, number | null> {
  return {
    completion: ratio(r.finished_text, r.opened_text),
    aiUsage: ratio(r.asked_ai, r.opened_text),
    reflection: ratio(r.reflected, r.finished_text),
    unlock: ratio(r.unlocked, r.opened_text),
    discussion: ratio(r.commented, r.unlocked),
    feedback: ratio(r.feedback_count, r.reflected),
  };
}

/** Targets from the grant proposal. */
export const TARGETS = { reach: 500, finish: 400, reflections: 400, feedbackRate: 0.1 } as const;

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
