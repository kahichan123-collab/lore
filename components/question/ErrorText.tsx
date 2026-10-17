"use client";

import { useTranslations } from "next-intl";
import type { ActionError } from "@/lib/actions/question";

export function ErrorText({ error, id }: { error: ActionError | null; id?: string }) {
  const t = useTranslations("question.errors");
  if (!error) return null;
  return (
    <p id={id} role="alert" className="text-sm text-red-800">
      {t(error)}
    </p>
  );
}
