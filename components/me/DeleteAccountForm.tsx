"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { deleteAccount, type ProfileState } from "@/lib/actions/profile";

export function DeleteAccountForm() {
  const t = useTranslations("me");
  const locale = useLocale();
  const word = t("confirmWord");
  const [state, action, pending] = useActionState<ProfileState, FormData>(deleteAccount, { status: "idle" });

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="currentLocale" value={locale} />
      <input type="hidden" name="expected" value={word} />
      <label htmlFor="confirm-delete" className="block text-sm">{t("confirmLabel", { word })}</label>
      <input
        id="confirm-delete"
        name="confirm"
        autoComplete="off"
        className="w-full max-w-xs rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-red-800"
      />
      {state.status === "error" && <p role="alert" className="text-sm text-red-800">{t(`errors.${state.error}`)}</p>}
      <button type="submit" disabled={pending} className="block rounded-full border border-red-800 px-5 py-2 text-sm text-red-800 hover:bg-red-50 disabled:opacity-60">
        {t("deleteAccount")}
      </button>
    </form>
  );
}
