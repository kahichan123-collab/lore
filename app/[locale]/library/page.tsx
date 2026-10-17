import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuestionCard } from "@/components/QuestionCard";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getClassics, getPublishedQuestions } from "@/lib/data";
import { pick } from "@/lib/i18n-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("library");
  return { title: t("title") };
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tag?: string; level?: string }>;
};

export default async function LibraryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tag, level } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [classics, questions] = await Promise.all([getClassics(), getPublishedQuestions()]);
  const tags = [...new Set(questions.flatMap((q) => q.tags))].sort();
  const levelNum = level && ["1", "2", "3"].includes(level) ? Number(level) : null;
  const filtered = questions.filter((q) => (!tag || q.tags.includes(tag)) && (!levelNum || q.difficulty === levelNum));

  const href = (next: { tag?: string | null; level?: string | null }) => {
    const query = new URLSearchParams();
    const nextTag = next.tag === undefined ? tag : next.tag;
    const nextLevel = next.level === undefined ? level : next.level;
    if (nextTag) query.set("tag", nextTag);
    if (nextLevel) query.set("level", nextLevel);
    const qs = query.toString();
    return qs ? `/library?${qs}` : "/library";
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-ink bg-ink text-paper" : "border-line hover:border-accent"}`;
  const tagLabel = (x: string) => (t.has(`tags.${x}`) ? t(`tags.${x}`) : x);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-serif text-3xl">{t("library.title")}</h1>
      <p className="mt-2 text-ink-soft">{t("library.intro")}</p>

      <section aria-labelledby="classics-heading" className="mt-10">
        <h2 id="classics-heading" className="font-serif text-2xl">{t("library.classics")}</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {classics.map((c) => (
            <li key={c.id}>
              <Link
                href={`/library/${c.slug}`}
                className="block h-full rounded-lg border border-line bg-card p-5 transition hover:border-accent hover:shadow-sm"
              >
                <p className="font-serif text-xl">
                  {locale === "en" ? c.title_en : `《${c.title_zh}》`}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {pick(c, "author", locale as Locale)}
                  {pick(c, "era", locale as Locale) && ` · ${pick(c, "era", locale as Locale)}`}
                </p>
                <p className="mt-3 text-xs text-ink-soft">
                  {t("library.questionCount", { count: questions.filter((q) => q.classicSlug === c.slug).length })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="questions-heading" className="mt-14">
        <h2 id="questions-heading" className="font-serif text-2xl">{t("library.questions")}</h2>

        <div className="mt-4 space-y-3">
          <div role="group" aria-label={t("library.theme")} className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-ink-soft">{t("library.theme")}</span>
            <Link href={href({ tag: null })} aria-current={!tag ? "true" : undefined} className={chip(!tag)}>{t("library.all")}</Link>
            {tags.map((x) => (
              <Link key={x} href={href({ tag: x })} aria-current={tag === x ? "true" : undefined} className={chip(tag === x)}>
                {tagLabel(x)}
              </Link>
            ))}
          </div>
          <div role="group" aria-label={t("library.level")} className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-ink-soft">{t("library.level")}</span>
            <Link href={href({ level: null })} aria-current={!levelNum ? "true" : undefined} className={chip(!levelNum)}>{t("library.all")}</Link>
            {(["1", "2", "3"] as const).map((x) => (
              <Link key={x} href={href({ level: x })} aria-current={level === x ? "true" : undefined} className={chip(level === x)}>
                {t(`difficulty.${x}`)}
              </Link>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-6 text-ink-soft">{t("library.empty")}</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {filtered.map((q) => (
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
