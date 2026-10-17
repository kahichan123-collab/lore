import "server-only";
import { SEED_CLASSICS, SEED_EXCERPTS, SEED_QUESTIONS } from "@/lib/content/seed-data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { InsightSummary } from "@/lib/ai/insight-summary";
import type { StoredInsight } from "@/lib/ai/types";
import type { FeedComment, FeedReflection, OwnReflection, QuestionPageData } from "@/lib/types";

export const FEED_PAGE_SIZE = 20;

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

  const { data: count } = await supabase.rpc("question_reflection_count", { p_question: question.id });
  const reflectionCount = Number(count ?? 0);

  if (!excerpt) return { question, excerpt: null, classic: null, reflectionCount };
  const { classic, ...rest } = excerpt;
  return { question, excerpt: rest, classic, reflectionCount };
}

export interface CommunityData {
  mine: OwnReflection | null;
  feed: FeedReflection[];
  comments: FeedComment[];
  insight: StoredInsight | null;
  hasFeedback: boolean;
  /** Published reflections for this question, including pagination. */
  total: number;
  hasMore: boolean;
}

/**
 * The caller's own reflection, plus — only if they have submitted it — the
 * first page of the community feed. The database enforces the same rule; this
 * just avoids asking for what it would refuse.
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
    return {
      mine: (mine as OwnReflection | null) ?? null,
      feed: [],
      comments: [],
      insight: null,
      hasFeedback: false,
      total: 0,
      hasMore: false,
    };
  }

  const [feed, comments, insight, feedback, total] = await Promise.all([
    supabase.rpc("reflection_feed", { p_question: questionId, p_limit: FEED_PAGE_SIZE, p_offset: 0 }),
    supabase.rpc("comment_feed", { p_question: questionId }),
    supabase
      .from("ai_insights")
      .select("summary_json, generated_at")
      .eq("question_id", questionId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("feedback").select("id", { count: "exact", head: true }).eq("question_id", questionId).eq("user_id", userId),
    supabase.rpc("question_reflection_count", { p_question: questionId }),
  ]);
  if (feed.error) throw feed.error;
  if (comments.error) throw comments.error;

  const rows = (feed.data as FeedReflection[]).map((r) => ({
    ...r,
    like_count: Number(r.like_count),
    comment_count: Number(r.comment_count),
  }));
  const count = Number(total ?? 0);

  return {
    mine: mine as OwnReflection,
    feed: rows,
    comments: comments.data as FeedComment[],
    insight: insight.data
      ? { summary: insight.data.summary_json as InsightSummary, generatedAt: insight.data.generated_at as string }
      : null,
    hasFeedback: (feedback.count ?? 0) > 0,
    total: count,
    hasMore: rows.length < count,
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
  if (!seedExcerpt || !seedClassic) return { question, excerpt: null, classic: null, reflectionCount: 0 };
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
    reflectionCount: 0,
  };
}
