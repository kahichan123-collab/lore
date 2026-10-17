import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuestionCard } from "@/components/QuestionCard";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getClassics, getPublishedQuestions } from "@/lib/data";
import { pick } from "@/lib/i18n-content";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function load(slug: string) {
  const classic = (await getClassics()).find((c) => c.slug === slug);
  return classic ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const classic = await load(slug);
  return classic ? { title: pick(classic, "title", locale as Locale) } : {};
}

export default async function ClassicPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const classic = await load(slug);
  if (!classic) notFound();

  const t = await getTranslations("library");
  const loc = locale as Locale;
  const questions = (await getPublishedQuestions()).filter((q) => q.classicSlug === slug);
  const description = pick(classic, "description", loc);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/library" className="text-sm text-accent-strong underline underline-offset-4">← {t("back")}</Link>

      <header className="mt-8">
        <h1 className="font-serif text-4xl">{loc === "en" ? classic.title_en : `《${classic.title_zh}》`}</h1>
        <p className="mt-2 text-ink-soft">
          {loc === "en" ? classic.title_zh : classic.title_en} · {pick(classic, "author", loc)}
          {pick(classic, "era", loc) && ` · ${pick(classic, "era", loc)}`}
        </p>
      </header>

      {description && (
        <section aria-labelledby="why" className="mt-10">
          <h2 id="why" className="font-serif text-2xl">{t("why")}</h2>
          <p className="mt-3 leading-relaxed">{description}</p>
        </section>
      )}

      <section aria-labelledby="linked" className="mt-10">
        <h2 id="linked" className="font-serif text-2xl">{t("linked")}</h2>
        {questions.length === 0 ? (
          <p className="mt-3 text-ink-soft">{t("noLinked")}</p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {questions.map((q) => (
              <li key={q.id}>
                <QuestionCard question={q} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
