"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { reportContent, type ActionError } from "@/lib/actions/question";
import { LIMITS } from "@/lib/text";
import { ErrorText } from "./ErrorText";

export function ReportForm({
  targetType,
  targetId,
  onClose,
}: {
  targetType: "reflection" | "comment";
  targetId: string;
  onClose: () => void;
}) {
  const t = useTranslations("question.card");
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<ActionError | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) return <p role="status" className="mt-2 text-sm text-ink-soft">{t("reported")}</p>;

  return (
    <form
      className="mt-3 flex flex-col gap-2 rounded border border-line bg-paper p-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await reportContent({ targetType, targetId, reason });
          if (result.ok) setDone(true);
          else setError(result.error);
        });
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">{t("reportLabel")}</label>
      <textarea
        id={id}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={LIMITS.reportMax}
        required
        placeholder={t("reportPlaceholder")}
        className="rounded border border-line bg-card px-2 py-1.5 text-sm outline-none focus:border-accent-strong"
      />
      <ErrorText error={error} />
      <div className="flex gap-2 text-sm">
        <button type="submit" disabled={pending} className="rounded-full bg-ink px-3 py-1 text-paper disabled:opacity-60">
          {t("reportSend")}
        </button>
        <button type="button" onClick={onClose} className="px-2 py-1 text-ink-soft hover:text-ink">{t("cancel")}</button>
      </div>
    </form>
  );
}
