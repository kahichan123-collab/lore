import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProsePage } from "@/components/ProsePage";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("guidelines"))("title") };
}

export default async function GuidelinesPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <ProsePage namespace="guidelines" />;
}
