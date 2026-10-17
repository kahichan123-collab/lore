import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Field, Notice, buttonClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { deleteExcerpt, saveClassic, saveExcerpt } from "@/lib/actions/admin";
import type { Classic, Excerpt } from "@/lib/types";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

function ExcerptForm({ locale, classicId, excerpt, t }: { locale: string; classicId: string; excerpt?: Excerpt; t: (key: string) => string }) {
  return (
    <form action={saveExcerpt} className="space-y-4 rounded-lg border border-line bg-card p-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="classic_id" value={classicId} />
      {excerpt && <input type="hidden" name="id" value={excerpt.id} />}
      <Field label={t("field.text_en")} name="text_en" defaultValue={excerpt?.text_en} multiline rows={8} lang="en" />
      <Field label={t("field.text_zh")} name="text_zh" defaultValue={excerpt?.text_zh} multiline rows={6} lang="zh-HK" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="text_zh_is_summary" defaultChecked={excerpt?.text_zh_is_summary ?? true} />
        {t("field.text_zh_is_summary")}
      </label>
      <Field label={t("field.source_note")} name="source_note" defaultValue={excerpt?.source_note} required />
      <Field label={t("field.translator")} name="translator" defaultValue={excerpt?.translator} />
      <button type="submit" className={buttonClass}>{t("save")}</button>
    </form>
  );
}

export default async function EditClassic({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { saved, error } = await searchParams;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin.content");

  const isNew = id === "new";
  let classic: Classic | null = null;
  let excerpts: Excerpt[] = [];
  if (!isNew) {
    const [c, e] = await Promise.all([
      supabase.from("classics").select("*").eq("id", id).maybeSingle(),
      supabase.from("excerpts").select("*").eq("classic_id", id).order("created_at"),
    ]);
    if (!c.data) notFound();
    classic = c.data as Classic;
    excerpts = (e.data ?? []) as Excerpt[];
  }

  return (
    <div className="max-w-3xl space-y-10">
      <Link href="/admin/content" className="text-sm text-accent-strong underline underline-offset-4">← {t("backToList")}</Link>
      <Notice saved={saved} error={error} />

      <form action={saveClassic} className="space-y-4">
        <h2 className="font-serif text-2xl">{isNew ? t("newClassic") : classic!.title_en}</h2>
        <input type="hidden" name="locale" value={locale} />
        {classic && <input type="hidden" name="id" value={classic.id} />}
        <Field label={t("field.slug")} name="slug" defaultValue={classic?.slug} required pattern="[a-z0-9-]+" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("field.title_zh")} name="title_zh" defaultValue={classic?.title_zh} required />
          <Field label={t("field.title_en")} name="title_en" defaultValue={classic?.title_en} required />
          <Field label={t("field.author_zh")} name="author_zh" defaultValue={classic?.author_zh} required />
          <Field label={t("field.author_en")} name="author_en" defaultValue={classic?.author_en} required />
          <Field label={t("field.era_zh")} name="era_zh" defaultValue={classic?.era_zh} />
          <Field label={t("field.era_en")} name="era_en" defaultValue={classic?.era_en} />
        </div>
        <Field label={t("field.description_zh")} name="description_zh" defaultValue={classic?.description_zh} multiline lang="zh-HK" />
        <Field label={t("field.description_en")} name="description_en" defaultValue={classic?.description_en} multiline lang="en" />
        <button type="submit" className={buttonClass}>{t("save")}</button>
      </form>

      {classic && (
        <section aria-labelledby="excerpts" className="space-y-6">
          <div>
            <h2 id="excerpts" className="font-serif text-2xl">{t("excerpts")}</h2>
            <p className="mt-2 rounded bg-paper-deep px-3 py-2 text-sm text-ink-soft">{t("copyright")}</p>
          </div>
          {excerpts.map((excerpt) => (
            <div key={excerpt.id} className="space-y-2">
              <ExcerptForm locale={locale} classicId={classic.id} excerpt={excerpt} t={t} />
              <form action={deleteExcerpt}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="classic_id" value={classic.id} />
                <input type="hidden" name="id" value={excerpt.id} />
                <button type="submit" className="text-sm text-red-800 underline underline-offset-4">{t("delete")}</button>
              </form>
            </div>
          ))}
          <div>
            <h3 className="mb-2 font-medium">+ {t("newExcerpt")}</h3>
            <ExcerptForm locale={locale} classicId={classic.id} t={t} />
          </div>
        </section>
      )}
    </div>
  );
}
