"use client";

import { useId, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { addComment, deleteComment, type ActionError } from "@/lib/actions/question";
import { LIMITS } from "@/lib/text";
import type { FeedComment } from "@/lib/types";
import { ErrorText } from "./ErrorText";
import { ReportForm } from "./ReportForm";

const small = "text-xs text-ink-soft hover:text-ink";

/** Step 6: replies under a reflection, nested one level. */
export function CommentThread({
  questionId,
  reflectionId,
  comments,
}: {
  questionId: string;
  reflectionId: string;
  comments: FeedComment[];
}) {
  const t = useTranslations("question.card");
  const top = comments.filter((c) => !c.parent_id);
  const replies = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <div className="mt-4 border-t border-line pt-4">
      {top.length > 0 && (
        <ul className="space-y-4">
          {top.map((c) => (
            <li key={c.id}>
              <Comment comment={c} questionId={questionId} reflectionId={reflectionId} canReply />
              {replies(c.id).length > 0 && (
                <ul className="mt-3 space-y-3 border-l-2 border-line pl-4">
                  {replies(c.id).map((r) => (
                    <li key={r.id}>
                      <Comment comment={r} questionId={questionId} reflectionId={reflectionId} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className={top.length ? "mt-4" : ""}>
        <CommentForm questionId={questionId} reflectionId={reflectionId} parentId={null} placeholder={t("commentPlaceholder")} />
      </div>
    </div>
  );
}

function Comment({
  comment,
  questionId,
  reflectionId,
  canReply = false,
}: {
  comment: FeedComment;
  questionId: string;
  reflectionId: string;
  canReply?: boolean;
}) {
  const t = useTranslations("question.card");
  const format = useFormatter();
  const [replying, setReplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const [pending, startTransition] = useTransition();

  const name = comment.is_mine ? t("you") : comment.nickname ?? t("anonymous");

  return (
    <div className="text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{name}</span>
        {comment.is_author && <span className="rounded bg-paper-deep px-1.5 text-xs text-accent-strong">{t("author")}</span>}
        <time dateTime={comment.created_at} className="text-xs text-ink-soft">
          {format.dateTime(new Date(comment.created_at), { dateStyle: "medium" })}
        </time>
      </p>
      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{comment.body}</p>
      <div className="mt-1 flex gap-3">
        {canReply && <button type="button" className={small} onClick={() => setReplying((v) => !v)}>{t("reply")}</button>}
        {comment.is_mine ? (
          <button
            type="button"
            className={small}
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("deleteConfirm"))) return;
              startTransition(async () => {
                const result = await deleteComment({ commentId: comment.id });
                if (!result.ok) setError(result.error);
              });
            }}
          >
            {t("delete")}
          </button>
        ) : (
          <button type="button" className={small} onClick={() => setReporting((v) => !v)}>{t("report")}</button>
        )}
      </div>
      <ErrorText error={error} />
      {reporting && <ReportForm targetType="comment" targetId={comment.id} onClose={() => setReporting(false)} />}
      {replying && (
        <div className="mt-2">
          <CommentForm
            questionId={questionId}
            reflectionId={reflectionId}
            parentId={comment.id}
            placeholder={t("replyPlaceholder")}
            onDone={() => setReplying(false)}
          />
        </div>
      )}
    </div>
  );
}

function CommentForm({
  questionId,
  reflectionId,
  parentId,
  placeholder,
  onDone,
}: {
  questionId: string;
  reflectionId: string;
  parentId: string | null;
  placeholder: string;
  onDone?: () => void;
}) {
  const t = useTranslations("question.card");
  const id = useId();
  const [body, setBody] = useState("");
  const [error, setError] = useState<ActionError | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await addComment({ questionId, reflectionId, parentId, body });
          if (result.ok) {
            setBody("");
            onDone?.();
          } else setError(result.error);
        });
      }}
    >
      <label htmlFor={id} className="sr-only">{t("commentLabel")}</label>
      <textarea
        id={id}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={LIMITS.commentMax}
        placeholder={placeholder}
        className="w-full rounded border border-line bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent-strong"
      />
      <ErrorText error={error} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="rounded-full bg-ink px-4 py-1.5 text-sm text-paper hover:bg-accent-strong disabled:opacity-50"
        >
          {t("send")}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="px-2 text-sm text-ink-soft hover:text-ink">{t("cancel")}</button>
        )}
      </div>
    </form>
  );
}
