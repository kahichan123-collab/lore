import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/i18n-content";
import type { QuestionSummary } from "@/lib/types";

export async function QuestionCard({ question }: { question: QuestionSummary }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;

  return (
    <Link
      href={`/q/${question.slug}`}
      className="group flex h-full flex-col justify-between gap-6 rounded-lg border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-sm"
    >
      <h3 className="font-serif text-xl leading-snug group-hover:text-accent-strong">
        {pick(question, "question", locale)}
      </h3>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        {question.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-paper-deep px-2 py-0.5">
            {t.has(`tags.${tag}`) ? t(`tags.${tag}`) : tag}
          </span>
        ))}
        <span className="ml-auto">
          {question.hasText ? t("home.readers", { count: question.readers }) : t("home.comingSoon")}
        </span>
      </div>
    </Link>
  );
}
