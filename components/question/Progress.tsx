"use client";

import { useTranslations } from "next-intl";
import { STEPS } from "@/components/steps";

/** Compact 7-step progress bar for the question page. */
export function Progress({ current }: { current: number }) {
  const t = useTranslations();
  return (
    <nav aria-label={t("question.progressLabel")}>
      <p aria-hidden className="mb-2 text-xs text-ink-soft sm:hidden">
        {current + 1} / {STEPS.length} · <span className="font-medium text-ink">{t(`steps.${STEPS[current]}`)}</span>
      </p>
      <ol className="flex gap-1 text-xs">
        {STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li
              key={step}
              aria-current={state === "current" ? "step" : undefined}
              className="flex flex-1 flex-col gap-1.5"
            >
              <span
                aria-hidden
                className={`h-1 rounded-full ${state === "todo" ? "bg-line" : state === "done" ? "bg-accent" : "bg-accent-strong"}`}
              />
              <span className={`sr-only sm:not-sr-only ${state === "current" ? "font-medium text-ink" : "text-ink-soft"}`}>
                {i + 1}. {t(`steps.${step}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
