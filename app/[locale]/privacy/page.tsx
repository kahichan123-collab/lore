import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProsePage } from "@/components/ProsePage";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("privacy"))("title") };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <ProsePage namespace="privacy" />;
}
