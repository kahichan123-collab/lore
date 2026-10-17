"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <p role="status" className="rounded-lg border border-line bg-card p-4 leading-relaxed">
        {t("sent", { email: state.email })}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="text-sm font-medium">{t("email")}</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        aria-invalid={state.status === "error" && state.error === "invalidEmail"}
        aria-describedby={state.status === "error" ? "login-error" : undefined}
        className="rounded-lg border border-line bg-card px-3 py-2.5 outline-none focus:border-accent-strong"
      />
      {state.status === "error" && (
        <p id="login-error" role="alert" className="text-sm text-red-800">{t(state.error)}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent-strong px-5 py-2.5 font-medium text-paper hover:bg-ink disabled:opacity-60"
      >
        {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
