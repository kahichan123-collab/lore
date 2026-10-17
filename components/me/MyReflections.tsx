"use client";

import { useTransition } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { deleteMyReflection } from "@/lib/actions/profile";
import { pick } from "@/lib/i18n-content";
import type { ReflectionStatus } from "@/lib/types";

export interface MyReflection {
  id: string;
  status: ReflectionStatus;
  body: string;
  updated_at: string;
  question: { slug: string; question_zh: string; question_en: string };
}

export function MyReflections({ items }: { items: MyReflection[] }) {
  const t = useTranslations("me");
  const format = useFormatter();
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return <p className="text-ink-soft">{t("historyEmpty")}</p>;

  return (
    <ul className="space-y-4">
      {items.map((r) => (
        <li key={r.id} className="rounded-lg border border-line bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-serif text-lg">{pick(r.question, "question", locale)}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "published" ? "bg-paper-deep text-accent-strong" : "bg-paper-deep text-ink-soft"}`}>
              {t(`status.${r.status}`)}
            </span>
          </div>
          {r.body && <p className="mt-2 line-clamp-3 whitespace-pre-wrap font-serif text-sm text-ink-soft">{r.body}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <time dateTime={r.updated_at} className="text-xs text-ink-soft">
              {format.dateTime(new Date(r.updated_at), { dateStyle: "medium" })}
            </time>
            <Link href={`/q/${r.question.slug}`} className="text-accent-strong underline underline-offset-4">{t("open")}</Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm(t("deleteReflectionConfirm"))) startTransition(async () => void (await deleteMyReflection({ reflectionId: r.id })));
              }}
              className="text-ink-soft hover:text-red-800 disabled:opacity-60"
            >
              {t("deleteReflection")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
