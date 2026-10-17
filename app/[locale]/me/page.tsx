import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeleteAccountForm } from "@/components/me/DeleteAccountForm";
import { MyReflections, type MyReflection } from "@/components/me/MyReflections";
import { ProfileForm } from "@/components/me/ProfileForm";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("me"))("title") };
}

export default async function MePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/me`)}`);

  const t = await getTranslations("me");
  const supabase = await createClient();
  const { data } = await supabase
    .from("reflections")
    .select("id, status, body, updated_at, question:questions ( slug, question_zh, question_en )")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false });
  const reflections = (data ?? []) as unknown as MyReflection[];

  const section = "rounded-lg border border-line bg-card p-5 sm:p-6";
  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-12">
      <h1 className="font-serif text-3xl">{t("title")}</h1>

      <section aria-label={t("nickname")} className={section}>
        <ProfileForm nickname={profile.nickname} language={profile.language} />
      </section>

      <section aria-labelledby="history">
        <h2 id="history" className="mb-4 font-serif text-2xl">{t("history")}</h2>
        <MyReflections items={reflections} />
      </section>

      <section aria-labelledby="delete-account" className="rounded-lg border border-red-200 p-5 sm:p-6">
        <h2 id="delete-account" className="font-serif text-xl text-red-900">{t("account")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("accountBody")}</p>
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
