import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentProfile } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-redirect";
import { WelcomeForm } from "./WelcomeForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("welcome"))("title"), robots: { index: false } };
}

export default async function WelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next: requestedNext } = await searchParams;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/welcome`)}`);
  }

  const next = safeNextPath(requestedNext ?? `/${locale}`);
  if (profile.nickname_chosen) redirect(next);

  const t = await getTranslations("welcome");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl">{t("title")}</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">{t("body")}</p>
      <WelcomeForm locale={locale} next={next} />
    </div>
  );
}
