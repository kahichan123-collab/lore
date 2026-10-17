"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitFeedback, type ActionError } from "@/lib/actions/question";
import { ErrorText } from "./ErrorText";

function Scale({ name, label, value, onChange }: { name: string; label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" />
            <span className="flex size-10 items-center justify-center rounded-full border border-line text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-accent-strong hover:border-accent">
              {n}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Optional 1–5 feedback after unlocking, for the grant report. */
export function FeedbackForm({ questionId }: { questionId: string }) {
  const t = useTranslations("feedback");
  const [rating, setRating] = useState<number | null>(null);
  const [aiHelped, setAiHelped] = useState<number | null>(null);
  const [ownView, setOwnView] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<ActionError | null>(null);
  const [missing, setMissing] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) return <p role="status" className="rounded-lg border border-line bg-card p-5 text-ink-soft">{t("thanks")}</p>;

  return (
    <form
      className="space-y-5 rounded-lg border border-line bg-card p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return setMissing(true);
        startTransition(async () => {
          const result = await submitFeedback({ questionId, rating, aiHelped, ownView, comment });
          if (result.ok) setDone(true);
          else setError(result.error);
        });
      }}
    >
      <div>
        <h3 className="font-serif text-lg">{t("title")}</h3>
        <p className="mt-1 text-sm text-ink-soft">{t("intro")}</p>
        <p className="mt-1 text-xs text-ink-soft">{t("scale")}</p>
      </div>
      <Scale name="rating" label={t("rating")} value={rating} onChange={(v) => { setRating(v); setMissing(false); }} />
      <Scale name="aiHelped" label={t("aiHelped")} value={aiHelped} onChange={setAiHelped} />
      <Scale name="ownView" label={t("ownView")} value={ownView} onChange={setOwnView} />
      <div>
        <label htmlFor="feedback-comment" className="text-sm font-medium">{t("comment")}</label>
        <textarea
          id="feedback-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={500}
          className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent-strong"
        />
      </div>
      {missing && <p role="alert" className="text-sm text-red-800">{t("required")}</p>}
      <ErrorText error={error} />
      <button type="submit" disabled={pending} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-accent-strong disabled:opacity-60">
        {t("submit")}
      </button>
    </form>
  );
}
