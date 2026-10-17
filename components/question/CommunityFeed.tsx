"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { loadMoreReflections, saveReflection, setLike, type ActionError } from "@/lib/actions/question";
import { LIMITS, charCount, cleanText } from "@/lib/text";
import type { FeedComment, FeedReflection } from "@/lib/types";
import { CommentThread } from "./CommentThread";
import { ErrorText } from "./ErrorText";
import { ReportForm } from "./ReportForm";

/** Steps 5–6: everyone's reflections, shown only after the reader has submitted. */
export function CommunityFeed({
  questionId,
  feed,
  comments,
  total,
  hasMore,
}: {
  questionId: string;
  feed: FeedReflection[];
  comments: FeedComment[];
  total: number;
  hasMore: boolean;
}) {
  const t = useTranslations("question.unlock");
  const [extraReflections, setExtraReflections] = useState<FeedReflection[]>([]);
  const [extraComments, setExtraComments] = useState<FeedComment[]>([]);
  const [more, setMore] = useState(hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  const items = [...feed, ...extraReflections.filter((r) => !feed.some((f) => f.id === r.id))];
  const allComments = [...comments, ...extraComments.filter((c) => !comments.some((x) => x.id === c.id))];
  const count = Math.max(total, items.length);

  async function loadMore() {
    setLoading(true);
    setError(null);
    const result = await loadMoreReflections({ questionId, offset: items.length });
    if (result.ok) {
      setExtraReflections((prev) => [...prev, ...result.reflections]);
      setExtraComments((prev) => [...prev, ...result.comments]);
      setMore(items.length + result.reflections.length < count);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div>
      <p className="leading-relaxed text-ink-soft">{t("intro")}</p>
      <p className="mt-1 text-sm text-ink-soft">{t("count", { count })}</p>
      <ul className="mt-6 space-y-4">
        {items.map((r) => (
          <li key={r.id}>
            <ReflectionCard
              reflection={r}
              questionId={questionId}
              comments={allComments.filter((c) => c.reflection_id === r.id)}
            />
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="mt-6 rounded-lg border border-dashed border-line p-5 text-ink-soft">{t("empty")}</p>}

      {more && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-full border border-line px-5 py-2 text-sm hover:border-accent disabled:opacity-60"
          >
            {loading ? t("loadingMore") : t("loadMore")}
          </button>
        </div>
      )}
      <ErrorText error={error} />
    </div>
  );
}

function ReflectionCard({
  reflection: r,
  questionId,
  comments,
}: {
  reflection: FeedReflection;
  questionId: string;
  comments: FeedComment[];
}) {
  const t = useTranslations("question");
  const format = useFormatter();
  const [showReplies, setShowReplies] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(r.body);
  const [error, setError] = useState<ActionError | null>(null);
  const [pending, startTransition] = useTransition();
  const [like, setOptimisticLike] = useOptimistic({ liked: r.liked_by_me, count: r.like_count });

  const name = r.is_mine
    ? `${t("card.you")}${r.is_anonymous ? ` · ${t("card.anonymous")}` : ""}`
    : r.nickname ?? t("card.anonymous");
  const action = "rounded-full px-3 py-1 text-sm text-ink-soft hover:bg-paper-deep hover:text-ink";

  function toggleLike() {
    const liked = !like.liked;
    startTransition(async () => {
      setOptimisticLike({ liked, count: like.count + (liked ? 1 : -1) });
      const result = await setLike({ reflectionId: r.id, liked });
      if (!result.ok) setError(result.error);
    });
  }

  function saveEdit() {
    setError(null);
    startTransition(async () => {
      const result = await saveReflection({ questionId, body: draft, isAnonymous: r.is_anonymous, submit: true });
      if (result.ok) setEditing(false);
      else setError(result.error);
    });
  }

  const draftCount = charCount(cleanText(draft));

  return (
    <article className={`rounded-lg border bg-card p-5 ${r.is_mine ? "border-accent" : "border-line"}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{name}</p>
        <time dateTime={r.submitted_at} className="text-xs text-ink-soft">
          {format.dateTime(new Date(r.submitted_at), { dateStyle: "medium" })}
        </time>
      </header>

      {editing ? (
        <div className="mt-3">
          <label htmlFor={`edit-${r.id}`} className="sr-only">{t("reflection.label")}</label>
          <textarea
            id={`edit-${r.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-serif leading-8 outline-none focus:border-accent-strong"
          />
          <p className="text-right text-xs text-ink-soft">{t("reflection.count", { count: draftCount, max: LIMITS.reflectionMax })}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={pending || draftCount < LIMITS.reflectionMin || draftCount > LIMITS.reflectionMax}
              className="rounded-full bg-accent-strong px-4 py-1.5 text-sm text-paper disabled:opacity-50"
            >
              {t("reflection.saveEdit")}
            </button>
            <button type="button" onClick={() => { setEditing(false); setDraft(r.body); }} className={action}>
              {t("reflection.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap font-serif leading-8">{r.body}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1">
        {!r.is_mine && (
          <button type="button" onClick={toggleLike} aria-pressed={like.liked} className={`${action} ${like.liked ? "text-accent-strong" : ""}`}>
            <span aria-hidden>{like.liked ? "♥" : "♡"} </span>
            {t("card.likeCount", { count: like.count })}
          </button>
        )}
        {r.is_mine && like.count > 0 && (
          <span className="px-3 py-1 text-sm text-ink-soft"><span aria-hidden>♥ </span>{like.count}</span>
        )}
        <button type="button" onClick={() => setShowReplies((v) => !v)} aria-expanded={showReplies} className={action}>
          {showReplies ? t("card.hideReplies") : t("card.replies", { count: r.comment_count })}
        </button>
        {r.is_mine ? (
          !editing && <button type="button" onClick={() => setEditing(true)} className={action}>{t("reflection.edit")}</button>
        ) : (
          <button type="button" onClick={() => setReporting((v) => !v)} className={`${action} ml-auto`}>{t("card.report")}</button>
        )}
      </div>

      <ErrorText error={error} />
      {reporting && <ReportForm targetType="reflection" targetId={r.id} onClose={() => setReporting(false)} />}
      {showReplies && <CommentThread questionId={questionId} reflectionId={r.id} comments={comments} />}
    </article>
  );
}
