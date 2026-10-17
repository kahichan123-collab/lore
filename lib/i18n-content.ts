import type { Locale } from "@/i18n/routing";

/** Picks the `_zh` or `_en` field of a bilingual row, falling back to the other language. */
export function pick<K extends string>(
  row: { [P in `${K}_zh` | `${K}_en`]?: string | null },
  field: K,
  locale: Locale,
): string {
  const fields = row as Record<string, string | null | undefined>;
  const primary = fields[`${field}_${locale === "en" ? "en" : "zh"}`];
  const fallback = fields[`${field}_${locale === "en" ? "zh" : "en"}`];
  return (typeof primary === "string" && primary) || (typeof fallback === "string" ? fallback : "");
}
