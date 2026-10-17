"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/i18n-content";
import type { QuestionPageData } from "@/lib/types";

type Mode = "both" | "zh" | "en";

const paragraphs = (text: string | null) => (text ? text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : []);

export const EXCERPT_ID = "excerpt";

export function ExcerptReader({
  excerpt,
  classic,
}: {
  excerpt: NonNullable<QuestionPageData["excerpt"]>;
  classic: QuestionPageData["classic"];
}) {
  const t = useTranslations("question.text");
  const locale = useLocale() as Locale;
  const en = paragraphs(excerpt.text_en);
  const zh = paragraphs(excerpt.text_zh);
  const hasBoth = en.length > 0 && zh.length > 0;
  const [mode, setMode] = useState<Mode>(hasBoth ? (locale === "en" ? "en" : "both") : en.length ? "en" : "zh");

  const showEn = en.length > 0 && mode !== "zh";
  const showZh = zh.length > 0 && mode !== "en";
  const rows = Math.max(showEn ? en.length : 0, showZh ? zh.length : 0);
  const sideBySide = showEn && showZh;

  return (
    <article id={EXCERPT_ID} className="rounded-lg border border-line bg-card px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        {classic && (
          <div>
            <p className="font-serif text-lg">
              {locale === "en" ? <cite className="not-italic">{classic.title_en}</cite> : `《${classic.title_zh}》`}
            </p>
            <p className="text-sm text-ink-soft">{pick(classic, "author", locale)}</p>
          </div>
        )}
        {hasBoth && (
          <div role="group" aria-label={t("view")} className="flex rounded-full border border-line p-0.5 text-sm">
            {(["both", "zh", "en"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 ${mode === m ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
              >
                {t(m === "both" ? "modeBoth" : m === "zh" ? "modeZh" : "modeEn")}
              </button>
            ))}
          </div>
        )}
      </header>

      {showZh && excerpt.text_zh_is_summary && (
        <p className="mt-4 rounded bg-paper-deep px-3 py-2 text-sm text-ink-soft">
          <span className="mr-2 rounded border border-accent px-1.5 py-0.5 text-xs text-accent-strong">{t("summaryLabel")}</span>
          {t("summaryNote")}
        </p>
      )}

      <ol className="mt-6 space-y-6">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
            <span aria-hidden className="pt-1 text-right font-serif text-sm text-accent-strong">
              {i + 1}
            </span>
            <div className={sideBySide ? "grid gap-3 md:grid-cols-2 md:gap-6" : ""}>
              {showEn && en[i] && (
                <p lang="en" className="font-serif text-[1.05rem] leading-8">{en[i]}</p>
              )}
              {showZh && zh[i] && (
                <p lang="zh-HK" className={`font-serif text-[1.05rem] leading-8 ${sideBySide ? "text-ink-soft md:text-ink" : ""}`}>
                  {zh[i]}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <footer className="mt-8 space-y-1 border-t border-line pt-4 text-xs text-ink-soft">
        <p><span className="font-medium">{t("source")}</span>{excerpt.source_note}</p>
        {excerpt.translator && <p><span className="font-medium">{t("translator")}</span>{excerpt.translator}</p>}
      </footer>
    </article>
  );
}
