import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuestionCard } from "@/components/QuestionCard";
import { StepFlow } from "@/components/StepFlow";
import { Wordmark } from "@/components/Wordmark";
import { Link } from "@/i18n/navigation";
import { getFeaturedQuestions } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

const BARRIERS = ["why", "understand", "stop"] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const questions = await getFeaturedQuestions();
  const first = questions.find((q) => q.hasText) ?? questions[0];

  return (
    <div className="mx-auto max-w-5xl px-4">
      {!isSupabaseConfigured && (
        <p role="status" className="mt-4 rounded border border-line bg-paper-deep px-3 py-2 text-sm text-ink-soft">
          {t("notConfigured")}
        </p>
      )}

      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        <Wordmark size="lg" />
        <h1 className="mt-10 font-serif text-3xl leading-tight sm:text-4xl">{t("heroTitle")}</h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">{t("heroBody")}</p>
        {first && (
          <Link
            href={`/q/${first.slug}`}
            className="mt-8 rounded-full bg-accent-strong px-6 py-3 font-medium text-paper hover:bg-ink"
          >
            {t("cta")}
          </Link>
        )}
      </section>

      <section aria-labelledby="barriers" className="py-10">
        <h2 id="barriers" className="font-serif text-2xl">{t("barriersTitle")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {BARRIERS.map((key, i) => (
            <li key={key} className="rounded-lg border border-line bg-card p-5">
              <p className="font-serif text-sm text-accent-strong">0{i + 1}</p>
              <p className="mt-2 font-medium line-through decoration-accent/60">{t(`barriers.${key}.problem`)}</p>
              <p className="mt-3 leading-relaxed text-ink-soft">{t(`barriers.${key}.solution`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="questions-heading" id="questions" className="py-10">
        <h2 id="questions-heading" className="font-serif text-2xl">{t("questionsTitle")}</h2>
        {questions.length === 0 ? (
          <p className="mt-6 text-ink-soft">{t("questionsEmpty")}</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {questions.map((q) => (
              <li key={q.id}>
                <QuestionCard question={q} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="how" className="py-10">
        <h2 id="how" className="font-serif text-2xl">{t("howTitle")}</h2>
        <div className="mt-6">
          <StepFlow />
        </div>
      </section>
    </div>
  );
}
