"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { updateProfile, type ProfileState } from "@/lib/actions/profile";
import type { Language } from "@/lib/types";

const input = "w-full rounded-lg border border-line bg-paper px-3 py-2.5 outline-none focus:border-accent-strong";

export function ProfileForm({ nickname, language }: { nickname: string; language: Language }) {
  const t = useTranslations("me");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, { status: "idle" });

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="currentLocale" value={locale} />
      <div>
        <label htmlFor="nickname" className="text-sm font-medium">{t("nickname")}</label>
        <input id="nickname" name="nickname" defaultValue={nickname} required maxLength={30} aria-describedby="nickname-hint" className={`mt-1 ${input}`} />
        <p id="nickname-hint" className="mt-1 text-xs text-ink-soft">{t("nicknameHint")}</p>
      </div>
      <div>
        <label htmlFor="language" className="text-sm font-medium">{t("language")}</label>
        <select id="language" name="language" defaultValue={language} className={`mt-1 ${input}`}>
          <option value="zh-HK">繁體中文</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-accent-strong px-5 py-2 font-medium text-paper hover:bg-ink disabled:opacity-60">
          {t("save")}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.status === "saved" && <span className="text-ink-soft">{t("saved")}</span>}
          {state.status === "error" && <span role="alert" className="text-red-800">{t(`errors.${state.error}`)}</span>}
        </p>
      </div>
    </form>
  );
}
