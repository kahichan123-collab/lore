// Row shapes for the tables in supabase/migrations/0001_schema.sql.

export type Language = "zh-HK" | "en";

export interface Profile {
  id: string;
  nickname: string;
  language: Language;
  is_admin: boolean;
  created_at: string;
}

export interface Classic {
  id: string;
  slug: string;
  title_zh: string;
  title_en: string;
  author_zh: string;
  author_en: string;
  era_zh: string | null;
  era_en: string | null;
  description_zh: string | null;
  description_en: string | null;
}

export interface Excerpt {
  id: string;
  classic_id: string;
  text_zh: string | null;
  text_en: string | null;
  text_zh_is_summary: boolean;
  source_note: string;
  translator: string | null;
}

export type QuestionStatus = "draft" | "published" | "archived";

export interface Question {
  id: string;
  slug: string;
  question_zh: string;
  question_en: string;
  tags: string[];
  difficulty: 1 | 2 | 3;
  excerpt_id: string | null;
  status: QuestionStatus;
  featured: boolean;
  created_at: string;
}

export type ReflectionStatus = "draft" | "published" | "hidden";

/** The signed-in user's own reflection for a question. */
export interface OwnReflection {
  id: string;
  initial_answer: string | null;
  body: string;
  is_anonymous: boolean;
  status: ReflectionStatus;
}

/** A row from `reflection_feed()` — only returned once the caller has unlocked. */
export interface FeedReflection {
  id: string;
  body: string;
  is_anonymous: boolean;
  nickname: string | null;
  submitted_at: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
}

/** A row from `comment_feed()`. */
export interface FeedComment {
  id: string;
  reflection_id: string;
  parent_id: string | null;
  body: string;
  nickname: string | null;
  is_author: boolean;
  created_at: string;
  is_mine: boolean;
}

/** Everything the question page needs about the question and its text. */
export interface QuestionPageData {
  question: Pick<Question, "id" | "slug" | "question_zh" | "question_en" | "tags" | "difficulty">;
  excerpt: Pick<Excerpt, "id" | "text_zh" | "text_en" | "text_zh_is_summary" | "source_note" | "translator"> | null;
  classic: Pick<Classic, "slug" | "title_zh" | "title_en" | "author_zh" | "author_en"> | null;
}

/** A question card on the home page / library. */
export interface QuestionSummary extends Pick<Question, "id" | "slug" | "question_zh" | "question_en" | "tags" | "difficulty"> {
  hasText: boolean;
  readers: number;
}
