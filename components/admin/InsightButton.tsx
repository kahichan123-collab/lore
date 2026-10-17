"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { generateInsightNow } from "@/lib/actions/insight";
import { MIN_REFLECTIONS_FOR_INSIGHT, type InsightError } from "@/lib/ai/types";

export function InsightButton({ questionId, hasInsight }: { questionId: string; hasInsight: boolean }) {
  const t = useTranslations("question.insight");
  const [error, setError] = useState<InsightError | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await generateInsightNow({ questionId });
            if (result.ok) setOk(true);
            else setError(result.error);
          })
        }
        className="text-sm text-accent-strong underline underline-offset-4 disabled:opacity-60"
      >
        {pending ? t("generating") : hasInsight || ok ? t("regenerate") : t("generate")}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-800">{t(`errors.${error}`, { min: MIN_REFLECTIONS_FOR_INSIGHT })}</p>}
    </div>
  );
}
