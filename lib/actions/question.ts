"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { containsProfanity } from "@/lib/moderation";
import { createClient } from "@/lib/supabase/server";
import type { FeedComment, FeedReflection } from "@/lib/types";
import { LIMITS, charCount, cleanText } from "@/lib/text";

// All writes run as the signed-in user, so RLS and the database triggers
// apply on top of the checks here.

export type ActionError =
  | "notConfigured"
  | "signIn"
  | "tooShort"
  | "tooLong"
  | "empty"
  | "profanity"
  | "rateLimited"
  | "hidden"
  | "locked"
  | "generic";

export type ActionResult = { ok: true } | { ok: false; error: ActionError };

const uuid = z.uuid();
const QUESTION_PAGE = "/[locale]/q/[slug]";

type Session =
  | { ok: false; error: "notConfigured" | "signIn" }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string };

async function signedIn(): Promise<Session> {
  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "signIn" };
  return { ok: true, supabase, userId: user.id };
}

function fail(error: ActionError): ActionResult {
  return { ok: false, error };
}

function errorCode(error: { message: string; code?: string }): ActionError {
  if (/too many/i.test(error.message)) return "rateLimited";
  if (/hidden by a moderator/i.test(error.message)) return "hidden";
  if (/row-level security/i.test(error.message)) return "locked";
  return "generic";
}

function dbError(error: { message: string; code?: string }): ActionResult {
  const code = errorCode(error);
  if (code === "generic") console.error("Database error:", error.message);
  return fail(code);
}

/** Step 2: the reader's first instinct, saved on their (draft) reflection. */
export async function saveInitialAnswer(input: { questionId: string; text: string }): Promise<ActionResult> {
  const ctx = await signedIn();
  if (!ctx.ok) return fail(ctx.error);
  if (!uuid.safeParse(input.questionId).success) return fail("generic");

  const text = cleanText(String(input.text ?? ""));
  if (charCount(text) > LIMITS.initialMax) return fail("tooLong");
  if (containsProfanity(text)) return fail("profanity");

  const { supabase, userId } = ctx;
  const { data: existing } = await supabase
    .from("reflections")
    .select("id, status")
    .eq("question_id", input.questionId)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = existing
    ? existing.status === "draft"
      ? await supabase.from("reflections").update({ initial_answer: text || null }).eq("id", existing.id)
      : { error: null } // already submitted: the first thought is fixed
    : await supabase.from("reflections").insert({ question_id: input.questionId, user_id: userId, initial_answer: text || null });
  if (error) return dbError(error);

  revalidatePath(QUESTION_PAGE, "page");
  return { ok: true };
}

/**
 * Step 5: save a draft, submit (which unlocks the community), or edit a
 * reflection that was already submitted.
 */
export async function saveReflection(input: {
  questionId: string;
  body: string;
  isAnonymous: boolean;
  submit: boolean;
}): Promise<ActionResult> {
  const ctx = await signedIn();
  if (!ctx.ok) return fail(ctx.error);
  if (!uuid.safeParse(input.questionId).success) return fail("generic");

  const body = cleanText(String(input.body ?? ""));
  const isAnonymous = input.isAnonymous === true;
  const { supabase, userId } = ctx;

  const { data: existing } = await supabase
    .from("reflections")
    .select("id, status")
    .eq("question_id", input.questionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.status === "hidden") return fail("hidden");

  const publishing = input.submit || existing?.status === "published";
  const length = charCount(body);
  if (length > LIMITS.reflectionMax) return fail("tooLong");
  if (publishing && length < LIMITS.reflectionMin) return fail("tooShort");
  if (publishing && containsProfanity(body)) return fail("profanity");

  const fields = { body, is_anonymous: isAnonymous, status: publishing ? "published" : "draft" };
  const { error } = existing
    ? await supabase.from("reflections").update(fields).eq("id", existing.id)
    : await supabase.from("reflections").insert({ ...fields, question_id: input.questionId, user_id: userId });
  if (error) return dbError(error);

  if (publishing && existing?.status !== "published") {
    await supabase.from("events").insert([
      { user_id: userId, question_id: input.questionId, type: "submit_reflection" },
      { user_id: userId, question_id: input.questionId, type: "unlock" },
    ]);
  }

  revalidatePath(QUESTION_PAGE, "page");
  return { ok: true };
}

/** Step 7: comment on a reflection, or reply to a top-level comment. */
export async function addComment(input: {
  questionId: string;
  reflectionId: string;
  parentId: string | null;
  body: string;
}): Promise<ActionResult> {
  const ctx = await signedIn();
  if (!ctx.ok) return fail(ctx.error);
  if (!uuid.safeParse(input.reflectionId).success || (input.parentId && !uuid.safeParse(input.parentId).success)) {
    return fail("generic");
  }

  const body = cleanText(String(input.body ?? ""));
  if (!body) return fail("empty");
  if (charCount(body) > LIMITS.commentMax) return fail("tooLong");
  if (containsProfanity(body)) return fail("profanity");

  const { supabase, userId } = ctx;
  const { error } = await supabase.from("comments").insert({
    reflection_id: input.reflectionId,
    parent_id: input.parentId,
    user_id: userId,
    body,
  });
  if (error) return dbError(error);

  if (uuid.safeParse(input.questionId).success) {
    await supabase.from("events").insert({ user_id: userId, question_id: input.questionId, type: "comment" });
  }
  revalidatePath(QUESTION_PAGE, "page");
  return { ok: true };
}

/** Next page of the community feed, newest first. Requires the same unlock. */
export type LoadMoreResult =
  | { ok: true; reflections: FeedReflection[]; comments: FeedComment[] }
  | { ok: false; error: ActionError };

export async function loadMoreReflections(input: { questionId: string; offset: number }): Promise<LoadMoreResult> {
  const ctx = await signedIn();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (
    !uuid.safeParse(input.questionId).success ||
    !Number.isInteger(input.offset) ||
    input.offset < 0 ||
    input.offset > 10_000
  ) {
    return { ok: false, error: "generic" };
  }

  const [feed, comments] = await Promise.all([
    ctx.supabase.rpc("reflection_feed", {
      p_question: input.questionId,
      p_limit: 20,
      p_offset: input.offset,
    }),
    ctx.supabase.rpc("comment_feed", { p_question: input.questionId }),
  ]);
  if (feed.error) return { ok: false, error: errorCode(feed.error) };
  if (comments.error) return { ok: false, error: errorCode(comments.error) };

  return {
    ok: true,
    reflections: (feed.data as FeedReflection[]).map((r) => ({
      ...r,
      like_count: Number(r.like_count),
      comment_count: Number(r.comment_count),
    })),
    comments: comments.data as FeedComment[],
  };
}

export async function deleteComment(input: { commentId: string }): Promise<ActionResult> {
  const ctx = await signedIn();
  if (!ctx.ok) return fail(ctx.error);
  if (!uuid.safeParse(input.commentId).success) return fail("generic");

  const { error } = await ctx.supabase.from("comments").delete().eq("id", input.commentId).eq("user_id", ctx.userId);
  if (error) return dbError(error);
  revalidatePath(QUESTION_PAGE, "page");
  return { ok: true };
}

export async function setLike(input: { reflectionId: string; liked: boolean }): Promise<ActionResult> {
  const ctx = await signedIn();
  if (!ctx.ok) return fail(ctx.error);
  if (!uuid.safeParse(input.reflectionId).success) return fail("generic");

  const { supabase, userId } = ctx;
  const { error } = input.liked
    ? await supabase.from("likes").upsert({ user_id: userId, reflection_id: input.reflectionId }, { ignoreDuplicates: true })
    : await supabase.from("likes").delete().eq("user_id", userId).eq("reflection_id", input.reflectionId);
  if (error) return dbError(error);
  revalidatePath(QUESTION_PAGE, "page");
  return { ok: true };
}

export async function reportContent(input: {
  targetType: "reflection" | "comment";
  targetId: string;
  reason: string;
}): Promise<ActionResult> {
  const ctx = await signedIn();
  if (!ctx.ok) return fail(ctx.error);
  if (!["reflection", "comment"].includes(input.targetType) || !uuid.safeParse(input.targetId).success) return fail("generic");

  const reason = cleanText(String(input.reason ?? ""));
  if (!reason) return fail("empty");
  if (charCount(reason) > LIMITS.reportMax) return fail("tooLong");

  const { error } = await ctx.supabase.from("reports").insert({
    target_type: input.targetType,
    target_id: input.targetId,
    reporter_id: ctx.userId,
    reason,
  });
  // 23505 = already reported by this user; that's fine.
  if (error && error.code !== "23505") return dbError(error);
  return { ok: true };
}

/** Optional feedback after unlocking: measures whether LORE did its job. */
export async function submitFeedback(input: {
  questionId: string;
  rating: number;
  aiHelped: number | null;
  ownView: number | null;
  comment: string;
}): Promise<ActionResult> {
  const ctx = await signedIn();
  if (!ctx.ok) return fail(ctx.error);

  const score = z.number().int().min(1).max(5);
  const parsed = z
    .object({ questionId: uuid, rating: score, aiHelped: score.nullable(), ownView: score.nullable() })
    .safeParse(input);
  if (!parsed.success) return fail("generic");

  const comment = cleanText(String(input.comment ?? ""));
  if (charCount(comment) > 500) return fail("tooLong");
  if (containsProfanity(comment)) return fail("profanity");

  const { error } = await ctx.supabase.from("feedback").insert({
    user_id: ctx.userId,
    question_id: parsed.data.questionId,
    rating: parsed.data.rating,
    ai_helped: parsed.data.aiHelped,
    own_view: parsed.data.ownView,
    comment: comment || null,
  });
  // 23505 = already gave feedback for this question.
  if (error && error.code !== "23505") return dbError(error);
  if (!error) {
    await ctx.supabase.from("events").insert({
      user_id: ctx.userId,
      question_id: parsed.data.questionId,
      type: "feedback",
    });
  }
  return { ok: true };
}

const CLIENT_EVENTS =["view_question", "open_text", "finish_text"] as const;

/** Reading-progress analytics. Works signed out (counted by a random browser id). */
export async function trackEvent(input: {
  type: (typeof CLIENT_EVENTS)[number];
  questionId: string;
  anonId: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (!CLIENT_EVENTS.includes(input.type) || !uuid.safeParse(input.questionId).success) return;
  const anonId = typeof input.anonId === "string" && /^[\w-]{8,64}$/.test(input.anonId) ? input.anonId : null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("events").insert({
    user_id: user?.id ?? null,
    anon_id: anonId,
    question_id: input.questionId,
    type: input.type,
  });
}
