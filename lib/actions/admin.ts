"use server";

// Admin form actions. Each one re-checks admin status; the database's RLS
// policies are the second line of defence. Results are reported back by
// redirecting with ?saved=1 or ?error=… so the forms need no client code.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { getCurrentProfile } from "@/lib/auth";
import { parseImportJson, parseQuestionCsv } from "@/lib/content/import";
import { createClient } from "@/lib/supabase/server";
import { cleanText } from "@/lib/text";

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);
const req = (max: number) => z.string().transform(cleanText).pipe(z.string().min(1).max(max));
const opt = (max: number) => z.string().transform(cleanText).pipe(z.string().max(max)).transform((s) => s || null);

async function adminContext(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) throw new Error("Not an admin");
  const locale = z.enum(routing.locales).catch(routing.defaultLocale).parse(formData.get("locale"));
  return { supabase: await createClient(), locale };
}

function fields(formData: FormData) {
  return Object.fromEntries([...formData.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
}

function done(path: string, error?: string): never {
  revalidatePath("/[locale]", "layout");
  redirect(error ? `${path}?error=${encodeURIComponent(error.slice(0, 200))}` : `${path}?saved=1`);
}

function zodMessage(error: z.ZodError) {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

// ── Classics ─────────────────────────────────────────────────────────────────

const ClassicSchema = z.object({
  slug,
  title_zh: req(200),
  title_en: req(200),
  author_zh: req(200),
  author_en: req(200),
  era_zh: opt(200),
  era_en: opt(200),
  description_zh: opt(3000),
  description_en: opt(3000),
});

export async function saveClassic(formData: FormData) {
  const { supabase, locale } = await adminContext(formData);
  const id = String(formData.get("id") ?? "");
  const back = `/${locale}/admin/content/classic/${id || "new"}`;
  const parsed = ClassicSchema.safeParse(fields(formData));
  if (!parsed.success) done(back, zodMessage(parsed.error));

  const result = id
    ? await supabase.from("classics").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("classics").insert(parsed.data).select("id").single();
  if (result.error) done(back, result.error.message);
  done(`/${locale}/admin/content/classic/${result.data.id}`);
}

// ── Excerpts ─────────────────────────────────────────────────────────────────

// Excerpts must stay short: ~6,000 characters is a few paragraphs.
const ExcerptSchema = z
  .object({
    classic_id: z.uuid(),
    text_en: opt(6000),
    text_zh: opt(6000),
    source_note: req(300),
    translator: opt(300),
  })
  .refine((e) => e.text_en || e.text_zh, { message: "Add English or Chinese text", path: ["text_en"] });

export async function saveExcerpt(formData: FormData) {
  const { supabase, locale } = await adminContext(formData);
  const id = String(formData.get("id") ?? "");
  const back = `/${locale}/admin/content/classic/${String(formData.get("classic_id") ?? "")}`;
  const parsed = ExcerptSchema.safeParse(fields(formData));
  if (!parsed.success) done(back, zodMessage(parsed.error));

  const row = { ...parsed.data, text_zh_is_summary: formData.get("text_zh_is_summary") === "on" };
  const { error } = id
    ? await supabase.from("excerpts").update(row).eq("id", id)
    : await supabase.from("excerpts").insert(row);
  done(back, error?.message);
}

export async function deleteExcerpt(formData: FormData) {
  const { supabase, locale } = await adminContext(formData);
  const id = z.uuid().safeParse(formData.get("id"));
  const back = `/${locale}/admin/content/classic/${String(formData.get("classic_id") ?? "")}`;
  if (!id.success) done(back, "Invalid id");
  const { error } = await supabase.from("excerpts").delete().eq("id", id.data);
  done(back, error?.message);
}

// ── Questions ────────────────────────────────────────────────────────────────

const QuestionSchema = z.object({
  slug,
  question_zh: req(300),
  question_en: req(300),
  tags: z
    .string()
    .transform((s) => [...new Set(s.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))])
    .pipe(z.array(slug).max(8)),
  difficulty: z.coerce.number().int().min(1).max(3),
  excerpt_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  status: z.enum(["draft", "published", "archived"]),
});

export async function saveQuestion(formData: FormData) {
  const { supabase, locale } = await adminContext(formData);
  const id = String(formData.get("id") ?? "");
  const back = `/${locale}/admin/content/question/${id || "new"}`;
  const parsed = QuestionSchema.safeParse(fields(formData));
  if (!parsed.success) done(back, zodMessage(parsed.error));

  const row = { ...parsed.data, featured: formData.get("featured") === "on" };
  const result = id
    ? await supabase.from("questions").update(row).eq("id", id).select("id").single()
    : await supabase.from("questions").insert(row).select("id").single();
  if (result.error) done(back, result.error.message);
  done(`/${locale}/admin/content/question/${result.data.id}`);
}

// ── Import ───────────────────────────────────────────────────────────────────

async function readUpload(formData: FormData): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (file && typeof file === "object" && "text" in file) {
    const upload = file as File;
    if (upload.size > 2_000_000) return { ok: false, error: "File is too large (maximum 2 MB)." };
    if (upload.size > 0) return { ok: true, text: await upload.text() };
  }
  const text = String(formData.get("text") ?? "");
  return text.trim() ? { ok: true, text } : { ok: false, error: "Choose a file or paste the content." };
}

export async function importContent(formData: FormData) {
  const { supabase, locale } = await adminContext(formData);
  const back = `/${locale}/admin/content/import`;
  const mode = String(formData.get("mode") ?? "json");

  const upload = await readUpload(formData);
  if (!upload.ok) done(back, upload.error);

  if (mode === "json") {
    const parsed = parseImportJson(upload.text);
    if (!parsed.ok) done(back, parsed.error);
    const { classics, excerpts, questions } = parsed.data;

    const { data: classicRows, error: classicError } = await supabase
      .from("classics")
      .upsert(classics, { onConflict: "slug" })
      .select("id, slug");
    if (classicError) done(back, classicError.message);
    const classicId = new Map((classicRows ?? []).map((c) => [c.slug as string, c.id as string]));

    // JSON may add excerpts/questions to classics that already exist.
    const referenced = new Set<string>();
    for (const excerpt of excerpts) referenced.add(excerpt.classic_slug);
    for (const question of questions) if (question.classic_slug) referenced.add(question.classic_slug);
    if (referenced.size > 0) {
      const { data: existingClassics } = await supabase
        .from("classics")
        .select("id, slug")
        .in("slug", [...referenced]);
      for (const c of existingClassics ?? []) classicId.set(c.slug as string, c.id as string);
    }

    for (const excerpt of excerpts) {
      const classic_id = classicId.get(excerpt.classic_slug);
      if (!classic_id) done(back, `Unknown classic: ${excerpt.classic_slug}`);
      const { classic_slug: _ignore, ...row } = excerpt;
      void _ignore;
      const { data: existing } = await supabase
        .from("excerpts")
        .select("id")
        .eq("classic_id", classic_id)
        .eq("source_note", excerpt.source_note)
        .maybeSingle();
      const result = existing
        ? await supabase.from("excerpts").update({ ...row, classic_id }).eq("id", existing.id)
        : await supabase.from("excerpts").insert({ ...row, classic_id });
      if (result.error) done(back, result.error.message);
    }

    for (const question of questions) {
      const { classic_slug, ...row } = question;
      let excerpt_id: string | null = null;
      if (classic_slug) {
        const cid = classicId.get(classic_slug);
        if (!cid) done(back, `Unknown classic: ${classic_slug}`);
        const { data: excerpt } = await supabase
          .from("excerpts")
          .select("id")
          .eq("classic_id", cid)
          .order("created_at")
          .limit(1)
          .maybeSingle();
        excerpt_id = excerpt?.id ?? null;
      }
      const { error } = await supabase
        .from("questions")
        .upsert({ ...row, excerpt_id }, { onConflict: "slug" });
      if (error) done(back, error.message);
    }
    done(back);
  }

  if (mode === "csv") {
    const parsed = parseQuestionCsv(upload.text);
    if (!parsed.ok) done(back, parsed.error);
    const wanted = [...new Set(parsed.data.map((q) => q.classic_slug).filter((s): s is string => Boolean(s)))];
    const { data: classics } = await supabase.from("classics").select("id, slug").in("slug", wanted);
    const classicId = new Map((classics ?? []).map((c) => [c.slug as string, c.id as string]));

    const excerptByClassic = new Map<string, string>();
    if (classicId.size > 0) {
      const { data: excerpts } = await supabase
        .from("excerpts")
        .select("id, classic_id")
        .in("classic_id", [...classicId.values()])
        .order("created_at");
      for (const excerpt of excerpts ?? []) {
        if (!excerptByClassic.has(excerpt.classic_id as string)) {
          excerptByClassic.set(excerpt.classic_id as string, excerpt.id as string);
        }
      }
    }

    for (const question of parsed.data) {
      const { classic_slug, ...row } = question;
      if (classic_slug && !classicId.has(classic_slug)) done(back, `Unknown classic: ${classic_slug}`);
      const excerpt_id = classic_slug ? excerptByClassic.get(classicId.get(classic_slug)!) ?? null : null;
      const { error } = await supabase
        .from("questions")
        .upsert({ ...row, excerpt_id }, { onConflict: "slug" });
      if (error) done(back, error.message);
    }
    done(back);
  }

  done(back, "Choose JSON or CSV.");
}

// ── Moderation ───────────────────────────────────────────────────────────────

const ModerationSchema = z.object({
  target_type: z.enum(["reflection", "comment"]),
  target_id: z.uuid(),
  action: z.enum(["hide", "unhide", "delete", "dismiss"]),
});

export async function moderate(formData: FormData) {
  const { supabase, locale } = await adminContext(formData);
  const back = `/${locale}/admin/moderation`;
  const parsed = ModerationSchema.safeParse(fields(formData));
  if (!parsed.success) done(back, zodMessage(parsed.error));
  const { target_type, target_id, action } = parsed.data;

  const table = target_type === "reflection" ? "reflections" : "comments";
  const visible = target_type === "reflection" ? "published" : "visible";
  let error: { message: string } | null = null;

  if (action === "hide") ({ error } = await supabase.from(table).update({ status: "hidden" }).eq("id", target_id));
  if (action === "unhide") ({ error } = await supabase.from(table).update({ status: visible }).eq("id", target_id));
  if (action === "delete") ({ error } = await supabase.from(table).delete().eq("id", target_id));
  if (error) done(back, error.message);

  if (action !== "unhide") {
    const { error: resolveError } = await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("target_type", target_type)
      .eq("target_id", target_id)
      .eq("status", "open");
    if (resolveError) done(back, resolveError.message);
  }
  done(back);
}
