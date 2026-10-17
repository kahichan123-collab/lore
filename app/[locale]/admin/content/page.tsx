import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/admin";
import { pick } from "@/lib/i18n-content";

export default async function AdminContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin.content");
  const loc = locale as Locale;

  const [{ data: classics }, { data: questions }] = await Promise.all([
    supabase.from("classics").select("id, title_zh, title_en, author_zh, author_en").order("created_at"),
    supabase.from("questions").select("id, slug, question_zh, question_en, status, featured, excerpt_id").order("created_at"),
  ]);

  const row = "flex items-center justify-between gap-3 px-4 py-3";
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section aria-labelledby="classics">
        <div className="flex items-center justify-between">
          <h2 id="classics" className="font-serif text-xl">{t("classics")}</h2>
          <Link href="/admin/content/classic/new" className="text-sm text-accent-strong underline underline-offset-4">+ {t("newClassic")}</Link>
        </div>
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-card">
          {(classics ?? []).map((c) => (
            <li key={c.id} className={row}>
              <span className="font-serif">{pick(c, "title", loc)} <span className="text-sm text-ink-soft">· {pick(c, "author", loc)}</span></span>
              <Link href={`/admin/content/classic/${c.id}`} className="text-sm text-accent-strong">{t("edit")}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="questions">
        <div className="flex items-center justify-between">
          <h2 id="questions" className="font-serif text-xl">{t("questions")}</h2>
          <div className="flex items-center gap-4">
            <Link href="/admin/content/import" className="text-sm text-accent-strong underline underline-offset-4">↑ {t("import")}</Link>
            <Link href="/admin/content/question/new" className="text-sm text-accent-strong underline underline-offset-4">+ {t("newQuestion")}</Link>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-card">
          {(questions ?? []).map((q) => (
            <li key={q.id} className={row}>
              <span>
                <span className="font-serif">{pick(q, "question", loc)}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t(`status.${q.status as "draft" | "published" | "archived"}`)}
                  {q.featured && " · ★"}
                  {!q.excerpt_id && ` · ${t("noExcerpt")}`}
                </span>
              </span>
              <Link href={`/admin/content/question/${q.id}`} className="shrink-0 text-sm text-accent-strong">{t("edit")}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
