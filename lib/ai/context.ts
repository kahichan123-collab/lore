import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionContext } from "./prompts";

interface Row {
  id: string;
  question_zh: string;
  question_en: string;
  excerpt: {
    text_zh: string | null;
    text_en: string | null;
    text_zh_is_summary: boolean;
    source_note: string;
    translator: string | null;
    classic: { title_en: string; author_en: string } | null;
  } | null;
}

/**
 * The question and its excerpt, loaded from the database by id — never taken
 * from the browser, so the AI is always grounded in the real text.
 */
export async function loadQuestionContext(supabase: SupabaseClient, questionId: string): Promise<QuestionContext | null> {
  const { data } = await supabase
    .from("questions")
    .select(`
      id, question_zh, question_en,
      excerpt:excerpts ( text_zh, text_en, text_zh_is_summary, source_note, translator,
        classic:classics ( title_en, author_en ) )`)
    .eq("id", questionId)
    .maybeSingle();
  const row = data as unknown as Row | null;
  if (!row?.excerpt) return null;

  return {
    questionZh: row.question_zh,
    questionEn: row.question_en,
    textEn: row.excerpt.text_en,
    textZh: row.excerpt.text_zh,
    textZhIsSummary: row.excerpt.text_zh_is_summary,
    sourceNote: row.excerpt.source_note,
    translator: row.excerpt.translator,
    classicTitle: row.excerpt.classic?.title_en ?? null,
    author: row.excerpt.classic?.author_en ?? null,
  };
}
