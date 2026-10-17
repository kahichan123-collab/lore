"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import type { CompanionError, CompanionResponse } from "@/lib/ai/types";
import { EXCERPT_ID } from "./ExcerptReader";

const MAX_QUOTE = 600;

interface Turn {
  role: "user" | "assistant";
  text: string;
  quote?: string;
}

/**
 * Step 3: the AI Companion. A sticky side panel on desktop, a bottom drawer
 * on phones. Selecting text inside the excerpt quotes it into the question.
 * Conversations live only in this browser tab — they are never stored.
 */
export function CompanionPanel({
  questionId,
  signedIn,
  configured,
  initialRemaining,
  loginHref,
}: {
  questionId: string;
  signedIn: boolean;
  configured: boolean;
  initialRemaining: number | null;
  loginHref: string;
}) {
  const t = useTranslations("question.companion");
  const tNav = useTranslations("nav");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState("");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [error, setError] = useState<CompanionError | null>(null);
  const [pending, setPending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onSelection() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const excerpt = document.getElementById(EXCERPT_ID);
      if (!excerpt || !selection.anchorNode || !excerpt.contains(selection.anchorNode)) return;
      const text = selection.toString().replace(/\s+/g, " ").trim();
      if (text) setQuote(text.slice(0, MAX_QUOTE));
    }
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [turns, pending]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q && !quote) return setError("empty");
    if (!configured) return setError("notConfigured");

    setError(null);
    setPending(true);
    const history = turns.map(({ role, text }) => ({ role, text }));
    setTurns((prev) => [...prev, { role: "user", text: q, quote: quote || undefined }]);
    setQuestion("");
    setQuote("");

    try {
      const res = await fetch("/api/ai/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, locale, question: q, quote: quote || undefined, history }),
      });
      const data = (await res.json()) as CompanionResponse;
      if (data.remaining !== undefined) setRemaining(data.remaining);
      if ("answer" in data) {
        setTurns((prev) => [...prev, { role: "assistant", text: data.answer }]);
      } else {
        setError(data.error);
        setTurns((prev) => prev.slice(0, -1)); // let them retry the same question
        setQuestion(q);
      }
    } catch {
      setError("failed");
      setTurns((prev) => prev.slice(0, -1));
      setQuestion(q);
    } finally {
      setPending(false);
    }
  }

  const canAsk = signedIn || !configured;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="companion"
        className="fixed bottom-4 right-4 z-30 rounded-full bg-ink px-4 py-3 text-sm font-medium text-paper shadow-lg lg:hidden"
      >
        {t("open")}
      </button>

      {open && <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-ink/20 lg:hidden" />}

      <aside
        id="companion"
        aria-label={t("title")}
        className={`${open ? "fixed inset-x-0 bottom-0 z-40 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t shadow-2xl" : "hidden"} border-line bg-card p-5 lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:rounded-lg lg:border lg:shadow-none`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg">{t("title")}</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded px-2 py-1 text-sm text-ink-soft hover:text-ink lg:hidden">
            {t("close")}
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("intro")}</p>

        {turns.length > 0 && (
          <ol aria-live="polite" className="mt-4 space-y-3">
            {turns.map((turn, i) => (
              <li key={i} className={turn.role === "user" ? "ml-6 rounded-lg bg-paper-deep px-3 py-2 text-sm" : "text-sm leading-relaxed"}>
                <p className="sr-only">{turn.role === "user" ? t("you") : t("title")}:</p>
                {turn.quote && <p className="mb-1 border-l-2 border-accent pl-2 font-serif text-xs text-ink-soft line-clamp-3">{turn.quote}</p>}
                <p className="whitespace-pre-wrap">{turn.text}</p>
              </li>
            ))}
          </ol>
        )}
        {pending && <p role="status" className="mt-3 animate-pulse text-sm text-ink-soft">{t("thinking")}</p>}
        <div ref={bottom} />

        {canAsk ? (
          <form onSubmit={ask} className="mt-4 flex flex-col gap-3">
            {quote ? (
              <div className="rounded border-l-2 border-accent bg-paper px-3 py-2 text-sm">
                <p className="text-xs text-ink-soft">{t("selection")}</p>
                <p className="mt-1 line-clamp-4 font-serif">{quote}</p>
                <button type="button" onClick={() => setQuote("")} className="mt-1 text-xs text-accent-strong underline underline-offset-2">
                  {t("clearSelection")}
                </button>
              </div>
            ) : (
              <p className="text-xs text-ink-soft">{t("selectHint")}</p>
            )}
            <label htmlFor="companion-question" className="sr-only">{t("label")}</label>
            <textarea
              id="companion-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
              }}
              rows={3}
              maxLength={500}
              placeholder={t("placeholder")}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent-strong"
            />
            {error && (
              <p role="alert" className="text-sm text-red-800">{t(`errors.${error}`)}</p>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-ink-soft">{remaining !== null && t("remaining", { count: remaining })}</p>
              <button
                type="submit"
                disabled={pending || remaining === 0}
                className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-accent-strong disabled:opacity-50"
              >
                {t("send")}
              </button>
            </div>
            <p className="text-xs text-ink-soft">{t("disclaimer")}</p>
          </form>
        ) : (
          <div className="mt-4">
            <p className="text-sm">{t("signIn")}</p>
            <Link href={loginHref} className="mt-3 inline-block rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-accent-strong">
              {tNav("signIn")}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
