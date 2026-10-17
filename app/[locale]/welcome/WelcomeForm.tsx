"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { chooseNickname, type WelcomeState } from "./actions";

export function WelcomeForm({ locale, next }: { locale: string; next: string }) {
  const t = useTranslations("welcome");
  const [state, action, pending] = useActionState<WelcomeState, FormData>(chooseNickname, { status: "idle" });

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="nickname" className="block text-sm font-medium">{t("label")}</label>
        <input
          id="nickname"
          name="nickname"
          required
          minLength={1}
          maxLength={30}
          autoComplete="nickname"
          autoFocus
          placeholder={t("placeholder")}
          className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 outline-none focus:border-accent-strong"
        />
        <p className="mt-2 text-xs text-ink-soft">{t("hint")}</p>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-800">{t(`errors.${state.error}`)}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent-strong px-6 py-2.5 font-medium text-paper hover:bg-ink disabled:opacity-60"
      >
        {pending ? t("saving") : t("submit")}
      </button>
    </form>
  );
}
