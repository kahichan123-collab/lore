"use client";

import { useState, useTransition } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { generateInsightNow } from "@/lib/actions/insight";
import { MIN_REFLECTIONS_FOR_INSIGHT, type InsightError, type StoredInsight } from "@/lib/ai/types";

/** Step 7: neutral summary of the community's views, plus where to go next. */
export function InsightPanel({
  questionId,
  insight,
  isAdmin,
}: {
  questionId: string;
  insight: StoredInsight | null;
  isAdmin: boolean;
}) {
  const t = useTranslations("question.insight");
  const format = useFormatter();
  const locale = useLocale() as Locale;
  const lang = locale === "en" ? "en" : "zh";
  const [error, setError] = useState<InsightError | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateInsightNow({ questionId });
      if (!result.ok) setError(result.error);
    });
  }

  const s = insight?.summary;

  return (
    <div className="rounded-lg border border-line bg-card p-5 sm:p-6">
      <p className="text-sm leading-relaxed text-ink-soft">{t("intro")}</p>

      {s && insight ? (
        <>
          <p className="mt-1 text-xs text-ink-soft">
            {t("basedOn", { count: s.total, date: format.dateTime(new Date(insight.generatedAt), { dateStyle: "medium" }) })}
          </p>

          <ul className="mt-6 space-y-5">
            {s.themes.map((theme, i) => {
              const percent = s.total ? Math.round((theme.count / s.total) * 100) : 0;
              return (
                <li key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-serif text-lg">{theme.title[lang]}</h3>
                    <p className="shrink-0 text-sm text-ink-soft">
                      {t("people", { count: theme.count })} · {t("share", { percent })}
                    </p>
                  </div>
                  <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-deep">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-2 leading-relaxed">{theme.summary[lang]}</p>
                </li>
              );
            })}
          </ul>

          {s.recommended_classics.length > 0 && (
            <div className="mt-8 border-t border-line pt-5">
              <h3 className="font-medium">{t("recommend")}</h3>
              <ul className="mt-3 space-y-3">
                {s.recommended_classics.map((book, i) => (
                  <li key={i}>
                    <p className="font-serif">
                      {lang === "zh" ? `《${book.title.zh}》` : <cite>{book.title.en}</cite>} · {book.author[lang]}
                    </p>
                    <p className="text-sm text-ink-soft">{book.why[lang]}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 rounded-lg bg-paper-deep p-4">
            <h3 className="text-sm text-ink-soft">{t("next")}</h3>
            <p className="mt-1 font-serif text-xl">{s.next_question[lang]}</p>
          </div>
        </>
      ) : (
        <p className="mt-4 rounded border border-dashed border-line p-4 text-ink-soft">
          {t("pending", { min: MIN_REFLECTIONS_FOR_INSIGHT })}
        </p>
      )}

      {isAdmin && (
        <div className="mt-6 border-t border-line pt-4">
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="rounded-full border border-accent px-4 py-1.5 text-sm text-accent-strong hover:bg-paper-deep disabled:opacity-60"
          >
            {pending ? t("generating") : s ? t("regenerate") : t("generate")}
          </button>
          <span className="ml-2 text-xs text-ink-soft">{t("adminOnly")}</span>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-800">
              {t(`errors.${error}`, { min: MIN_REFLECTIONS_FOR_INSIGHT })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
