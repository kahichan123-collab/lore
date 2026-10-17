import "server-only";
import { SEED_CLASSICS, SEED_EXCERPTS, SEED_QUESTIONS } from "@/lib/content/seed-data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { InsightSummary } from "@/lib/ai/insight-summary";
import type { StoredInsight } from "@/lib/ai/types";
import type { FeedComment, FeedReflection, OwnReflection, QuestionPageData } from "@/lib/types";

export async function getQuestionPage(slug: string): Promise<QuestionPageData | null> {
  if (!isSupabaseConfigured) return seedQuestionPage(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select(`
      id, slug, question_zh, question_en, tags, difficulty,
      excerpt:excerpts (
        id, text_zh, text_en, text_zh_is_summary, source_note, translator,
        classic:classics ( slug, title_zh, title_en, author_zh, author_en )
      )`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { excerpt, ...question } = data as unknown as QuestionPageData["question"] & {
    excerpt: (NonNullable<QuestionPageData["excerpt"]> & { classic: QuestionPageData["classic"] }) | null;
  };
  if (!excerpt) return { question, excerpt: null, classic: null };
  const { classic, ...rest } = excerpt;
  return { question, excerpt: rest, classic };
}

export interface CommunityData {
  mine: OwnReflection | null;
  feed: FeedReflection[];
  comments: FeedComment[];
  insight: StoredInsight | null;
  hasFeedback: boolean;
}

/**
 * The caller's own reflection, plus — only if they have submitted it — the
 * community feed. The database enforces the same rule; this just avoids
 * asking for what it would refuse.
 */
export async function getCommunity(questionId: string, userId: string): Promise<CommunityData> {
  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("reflections")
    .select("id, initial_answer, body, is_anonymous, status")
    .eq("question_id", questionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!mine || mine.status === "draft") {
    return { mine: (mine as OwnReflection | null) ?? null, feed: [], comments: [], insight: null, hasFeedback: false };
  }

  const [feed, comments, insight, feedback] = await Promise.all([
    supabase.rpc("reflection_feed", { p_question: questionId }),
    supabase.rpc("comment_feed", { p_question: questionId }),
    supabase
      .from("ai_insights")
      .select("summary_json, generated_at")
      .eq("question_id", questionId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("feedback").select("id", { count: "exact", head: true }).eq("question_id", questionId).eq("user_id", userId),
  ]);
  if (feed.error) throw feed.error;
  if (comments.error) throw comments.error;

  return {
    mine: mine as OwnReflection,
    feed: (feed.data as FeedReflection[]).map((r) => ({ ...r, like_count: Number(r.like_count), comment_count: Number(r.comment_count) })),
    comments: comments.data as FeedComment[],
    insight: insight.data
      ? { summary: insight.data.summary_json as InsightSummary, generatedAt: insight.data.generated_at as string }
      : null,
    hasFeedback: (feedback.count ?? 0) > 0,
  };
}

function seedQuestionPage(slug: string): QuestionPageData | null {
  const q = SEED_QUESTIONS.find((s) => s.slug === slug);
  if (!q) return null;
  const question = {
    id: q.slug,
    slug: q.slug,
    question_zh: q.question_zh,
    question_en: q.question_en,
    tags: q.tags,
    difficulty: q.difficulty,
  };
  const seedExcerpt = SEED_EXCERPTS.find((e) => e.classic_slug === q.excerpt_classic_slug);
  const seedClassic = SEED_CLASSICS.find((c) => c.slug === q.excerpt_classic_slug);
  if (!seedExcerpt || !seedClassic) return { question, excerpt: null, classic: null };
  const { classic_slug, ...excerpt } = seedExcerpt;
  return {
    question,
    excerpt: { id: classic_slug, ...excerpt },
    classic: {
      slug: seedClassic.slug,
      title_zh: seedClassic.title_zh,
      title_en: seedClassic.title_en,
      author_zh: seedClassic.author_zh,
      author_en: seedClassic.author_en,
    },
  };
}
