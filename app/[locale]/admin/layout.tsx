import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin"))("title"), robots: { index: false } };
}

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("admin");

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-serif text-3xl">{t("title")}</h1>
        <p role="status" className="mt-6 rounded border border-line bg-paper-deep px-3 py-2 text-sm text-ink-soft">{t("demo")}</p>
      </div>
    );
  }

  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-3xl">{t("title")}</h1>
      <div className="mt-6">
        <AdminTabs />
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
