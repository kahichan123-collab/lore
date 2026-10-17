"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveReflection, type ActionError } from "@/lib/actions/question";
import { LIMITS, charCount, cleanText } from "@/lib/text";
import type { OwnReflection } from "@/lib/types";
import { ErrorText } from "./ErrorText";

/** Step 4: the reader writes their own answer. Submitting unlocks step 5. */
export function ReflectionEditor({
  questionId,
  mine,
  signedIn,
  configured,
  nickname,
  loginHref,
}: {
  questionId: string;
  mine: OwnReflection | null;
  signedIn: boolean;
  configured: boolean;
  nickname: string | null;
  loginHref: string;
}) {
  const t = useTranslations("question.reflection");
  const [body, setBody] = useState(mine?.body ?? "");
  const [anonymous, setAnonymous] = useState(mine?.is_anonymous ?? false);
  const [error, setError] = useState<ActionError | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const count = charCount(cleanText(body));
  const missing = Math.max(0, LIMITS.reflectionMin - count);

  if (configured && !signedIn) {
    return (
      <div className="rounded-lg border border-line bg-card p-5">
        <p className="leading-relaxed">{t("signIn")}</p>
        <Link href={loginHref} className="mt-4 inline-block rounded-full bg-accent-strong px-5 py-2.5 font-medium text-paper hover:bg-ink">
          {t("signInCta")}
        </Link>
      </div>
    );
  }

  function save(submit: boolean) {
    if (submit && !window.confirm(anonymous ? t("confirmAnon") : t("confirmNamed", { name: nickname ?? "" }))) return;
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveReflection({ questionId, body, isAnonymous: anonymous, submit });
      if (!result.ok) setError(result.error);
      else if (!submit) setSaved(true);
      // On submit the page re-renders with the unlocked community.
    });
  }

  return (
    <div className="rounded-lg border border-line bg-card p-5 sm:p-6">
      <label htmlFor="reflection-body" className="sr-only">{t("label")}</label>
      <textarea
        id="reflection-body"
        value={body}
        onChange={(e) => { setBody(e.target.value); setSaved(false); }}
        rows={9}
        maxLength={LIMITS.reflectionMax + 100}
        aria-describedby="reflection-count"
        className="w-full rounded-lg border border-line bg-paper px-3 py-3 font-serif text-[1.05rem] leading-8 outline-none focus:border-accent-strong"
      />
      <p id="reflection-count" aria-live="polite" className={`mt-1 text-right text-xs ${count > LIMITS.reflectionMax ? "text-red-800" : "text-ink-soft"}`}>
        {missing > 0 ? `${t("needMore", { count: missing })} · ` : ""}
        {t("count", { count, max: LIMITS.reflectionMax })}
      </p>

      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1 accent-accent-strong" />
        {t("anonymous")}
      </label>

      <div className="mt-4 space-y-2">
        <ErrorText error={error} />
        {saved && <p role="status" className="text-sm text-ink-soft">{t("draftSaved")}</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => save(true)}
          disabled={pending || !configured || missing > 0 || count > LIMITS.reflectionMax}
          className="rounded-full bg-accent-strong px-5 py-2.5 font-medium text-paper hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("submitting") : t("submit")}
        </button>
        <button
          type="button"
          onClick={() => save(false)}
          disabled={pending || !configured}
          className="rounded-full border border-line px-5 py-2.5 hover:border-accent disabled:opacity-50"
        >
          {t("saveDraft")}
        </button>
      </div>
    </div>
  );
}
