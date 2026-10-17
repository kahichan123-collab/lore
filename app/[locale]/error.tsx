"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Shown if a page throws (e.g. the database is unreachable).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-serif text-3xl">{t("title")}</h1>
      <p className="mt-3 text-ink-soft">{t("body")}</p>
      <div className="mt-8 flex justify-center gap-4">
        <button type="button" onClick={reset} className="rounded-full bg-accent-strong px-5 py-2 font-medium text-paper hover:bg-ink">
          {t("retry")}
        </button>
        <Link href="/" className="rounded-full border border-line px-5 py-2 hover:border-accent">{t("home")}</Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-ink-soft">#{error.digest}</p>}
    </div>
  );
}
