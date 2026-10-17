import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-redirect";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("title") };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { next, error } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("login");
  const nextPath = next ? safeNextPath(next) : `/${locale}`;

  if (await getCurrentProfile()) redirect(nextPath);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl">{t("title")}</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">{t("body")}</p>
      {error && (
        <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {t("callbackError")}
        </p>
      )}
      <div className="mt-8">
        <LoginForm next={nextPath} />
      </div>
      <p className="mt-6 text-xs text-ink-soft">{t("privacyNote")}</p>
    </div>
  );
}
