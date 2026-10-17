import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Field, Notice, buttonClass, inputClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { saveQuestion } from "@/lib/actions/admin";
import type { Question } from "@/lib/types";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

interface ExcerptOption {
  id: string;
  source_note: string;
  classic: { title_en: string } | null;
}

export default async function EditQuestion({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { saved, error } = await searchParams;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations();

  const isNew = id === "new";
  const [questionResult, excerptsResult] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from("questions").select("*").eq("id", id).maybeSingle(),
    supabase.from("excerpts").select("id, source_note, classic:classics ( title_en )").order("created_at"),
  ]);
  const question = questionResult.data as Question | null;
  if (!isNew && !question) notFound();
  const excerpts = (excerptsResult.data ?? []) as unknown as ExcerptOption[];
  const f = (key: string) => t(`admin.content.field.${key}`);

  return (
    <div className="max-w-3xl space-y-8">
      <Link href="/admin/content" className="text-sm text-accent-strong underline underline-offset-4">← {t("admin.content.backToList")}</Link>
      <Notice saved={saved} error={error} />

      <form action={saveQuestion} className="space-y-4">
        <h2 className="font-serif text-2xl">{isNew ? t("admin.content.newQuestion") : question!.question_en}</h2>
        <input type="hidden" name="locale" value={locale} />
        {question && <input type="hidden" name="id" value={question.id} />}
        <Field label={f("slug")} name="slug" defaultValue={question?.slug} required pattern="[a-z0-9-]+" />
        <Field label={f("question_zh")} name="question_zh" defaultValue={question?.question_zh} required lang="zh-HK" />
        <Field label={f("question_en")} name="question_en" defaultValue={question?.question_en} required lang="en" />
        <Field label={f("tags")} name="tags" defaultValue={question?.tags.join(", ")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="difficulty" className="mb-1 block text-sm font-medium">{f("difficulty")}</label>
            <select id="difficulty" name="difficulty" defaultValue={question?.difficulty ?? 1} className={inputClass}>
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>{t(`difficulty.${d}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium">{f("status")}</label>
            <select id="status" name="status" defaultValue={question?.status ?? "draft"} className={inputClass}>
              {(["draft", "published", "archived"] as const).map((s) => (
                <option key={s} value={s}>{t(`admin.content.status.${s}`)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="excerpt_id" className="mb-1 block text-sm font-medium">{f("excerpt")}</label>
          <select id="excerpt_id" name="excerpt_id" defaultValue={question?.excerpt_id ?? ""} className={inputClass}>
            <option value="">{t("admin.content.noExcerpt")}</option>
            {excerpts.map((e) => (
              <option key={e.id} value={e.id}>{e.classic?.title_en} — {e.source_note}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={question?.featured ?? false} />
          {f("featured")}
        </label>

        <button type="submit" className={buttonClass}>{t("admin.content.save")}</button>
      </form>
    </div>
  );
}
