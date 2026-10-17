"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveInitialAnswer, type ActionError } from "@/lib/actions/question";
import { LIMITS } from "@/lib/text";
import { ErrorText } from "./ErrorText";

const button = "rounded-full px-5 py-2.5 font-medium";

/** Step 2: the reader's first instinct, before reading. Optional. */
export function InitialAnswer({
  questionId,
  initial,
  signedIn,
  configured,
  loginHref,
  onDone,
}: {
  questionId: string;
  initial: string;
  signedIn: boolean;
  configured: boolean;
  loginHref: string;
  onDone: (text: string) => void;
}) {
  const t = useTranslations("question.firstThought");
  const tNav = useTranslations("nav");
  const [text, setText] = useState(initial);
  const [error, setError] = useState<ActionError | null>(null);
  const [pending, startTransition] = useTransition();
  const canWrite = signedIn || !configured;

  function save() {
    if (!configured) return onDone(text);
    startTransition(async () => {
      const result = await saveInitialAnswer({ questionId, text });
      if (result.ok) onDone(text);
      else setError(result.error);
    });
  }

  return (
    <section aria-labelledby="first-thought" className="rounded-lg border border-line bg-card p-5 sm:p-6">
      <h2 id="first-thought" className="font-serif text-xl">{t("title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("hint")}</p>

      {canWrite ? (
        <>
          <label htmlFor="initial-answer" className="sr-only">{t("label")}</label>
          <textarea
            id="initial-answer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={LIMITS.initialMax}
            rows={3}
            placeholder={t("placeholder")}
            className="mt-4 w-full rounded-lg border border-line bg-paper px-3 py-2.5 leading-relaxed outline-none focus:border-accent-strong"
          />
          <ErrorText error={error} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={save} disabled={pending} className={`${button} bg-accent-strong text-paper hover:bg-ink disabled:opacity-60`}>
              {t("save")}
            </button>
            <button type="button" onClick={() => onDone("")} className={`${button} text-ink-soft hover:text-ink`}>
              {t("skip")}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 leading-relaxed">{t("signIn")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={loginHref} className={`${button} bg-accent-strong text-paper hover:bg-ink`}>
              {tNav("signIn")}
            </Link>
            <button type="button" onClick={() => onDone("")} className={`${button} border border-line hover:border-accent`}>
              {t("skip")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
