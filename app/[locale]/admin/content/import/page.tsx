import { getTranslations, setRequestLocale } from "next-intl/server";
import { Notice, buttonClass, inputClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { importContent } from "@/lib/actions/admin";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function ImportContent({ params, searchParams }: Props) {
  const { locale } = await params;
  const { saved, error } = await searchParams;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.content");

  return (
    <div className="max-w-3xl space-y-8">
      <Link href="/admin/content" className="text-sm text-accent-strong underline underline-offset-4">← {t("backToList")}</Link>
      <Notice saved={saved} error={error} />

      <div>
        <h2 className="font-serif text-2xl">{t("importTitle")}</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">{t("importIntro")}</p>
        <p className="mt-2 rounded bg-paper-deep px-3 py-2 text-xs text-ink-soft">{t("importCopyright")}</p>
      </div>

      <form action={importContent} className="space-y-4 rounded-lg border border-line bg-card p-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="mode" value="json" />
        <h3 className="font-medium">{t("importJson")}</h3>
        <p className="text-sm text-ink-soft">{t("importJsonHelp")}</p>
        <div>
          <label htmlFor="json-file" className="mb-1 block text-sm font-medium">{t("importFile")}</label>
          <input id="json-file" name="file" type="file" accept=".json,application/json" className={inputClass} />
        </div>
        <div>
          <label htmlFor="json-text" className="mb-1 block text-sm font-medium">{t("importPaste")}</label>
          <textarea id="json-text" name="text" rows={10} className={`${inputClass} font-mono text-xs leading-relaxed`} placeholder='{ "classics": [], "excerpts": [], "questions": [] }' />
        </div>
        <button type="submit" className={buttonClass}>{t("importRun")}</button>
      </form>

      <form action={importContent} className="space-y-4 rounded-lg border border-line bg-card p-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="mode" value="csv" />
        <h3 className="font-medium">{t("importCsv")}</h3>
        <p className="text-sm text-ink-soft">{t("importCsvHelp")}</p>
        <code className="block overflow-x-auto rounded bg-paper-deep px-3 py-2 text-xs">
          slug,question_zh,question_en,tags,difficulty,classic_slug,status,featured
        </code>
        <div>
          <label htmlFor="csv-file" className="mb-1 block text-sm font-medium">{t("importFile")}</label>
          <input id="csv-file" name="file" type="file" accept=".csv,text/csv" className={inputClass} />
        </div>
        <div>
          <label htmlFor="csv-text" className="mb-1 block text-sm font-medium">{t("importPaste")}</label>
          <textarea id="csv-text" name="text" rows={6} className={`${inputClass} font-mono text-xs leading-relaxed`} placeholder="slug,question_zh,question_en,..." />
        </div>
        <button type="submit" className={buttonClass}>{t("importRun")}</button>
      </form>
    </div>
  );
}
