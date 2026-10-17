import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { SEED_CLASSICS, SEED_QUESTIONS } from "@/lib/content/seed-data";
import type { Classic, QuestionSummary } from "@/lib/types";

/** A question card plus the classic its excerpt comes from. */
export type LibraryQuestion = QuestionSummary & { classicSlug: string | null; featured: boolean };

/** All published questions, oldest first. */
export async function getPublishedQuestions(): Promise<LibraryQuestion[]> {
  if (!isSupabaseConfigured) {
    return SEED_QUESTIONS.map((q) => ({
      id: q.slug,
      slug: q.slug,
      question_zh: q.question_zh,
      question_en: q.question_en,
      tags: q.tags,
      difficulty: q.difficulty,
      hasText: q.excerpt_classic_slug !== null,
      readers: 0,
      classicSlug: q.excerpt_classic_slug,
      featured: q.featured,
    }));
  }

  const supabase = await createClient();
  const [{ data, error }, { data: counts }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, slug, question_zh, question_en, tags, difficulty, featured, excerpt:excerpts ( classic:classics ( slug ) )")
      .eq("status", "published")
      .order("created_at"),
    supabase.rpc("question_reader_counts"),
  ]);
  if (error) throw error;

  const readers = new Map(
    ((counts ?? []) as { question_id: string; readers: number }[]).map((c) => [c.question_id, Number(c.readers)]),
  );
  type Row = Omit<LibraryQuestion, "hasText" | "readers" | "classicSlug"> & { excerpt: { classic: { slug: string } | null } | null };
  return (data as unknown as Row[]).map(({ excerpt, ...q }) => ({
    ...q,
    hasText: excerpt !== null,
    readers: readers.get(q.id) ?? 0,
    classicSlug: excerpt?.classic?.slug ?? null,
  }));
}

/** Featured questions for the home page. */
export async function getFeaturedQuestions(): Promise<QuestionSummary[]> {
  return (await getPublishedQuestions()).filter((q) => q.featured);
}

export async function getClassics(): Promise<Classic[]> {
  if (!isSupabaseConfigured) return SEED_CLASSICS.map((c) => ({ id: c.slug, ...c }));
  const supabase = await createClient();
  const { data, error } = await supabase.from("classics").select("*").order("created_at");
  if (error) throw error;
  return data as Classic[];
}
