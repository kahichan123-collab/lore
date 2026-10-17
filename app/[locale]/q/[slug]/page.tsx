import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { QuestionFlow } from "@/components/question/QuestionFlow";
import type { Locale } from "@/i18n/routing";
import { isAiConfigured } from "@/lib/ai/client";
import { remainingAiQuestions } from "@/lib/ai/usage";
import { getCurrentProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { pick } from "@/lib/i18n-content";
import { getCommunity, getQuestionPage, type CommunityData } from "@/lib/question";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getQuestionPage(slug);
  return data ? { title: pick(data.question, "question", locale as Locale) } : {};
}

export default async function QuestionPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const data = await getQuestionPage(slug);
  if (!data) notFound();

  const profile = await getCurrentProfile();
  const [community, aiRemaining]: [CommunityData, number | null] = profile
    ? await Promise.all([
        getCommunity(data.question.id, profile.id),
        isAiConfigured ? createClient().then((db) => remainingAiQuestions(db, profile.id)) : Promise.resolve(null),
      ])
    : [{ mine: null, feed: [], comments: [], insight: null, hasFeedback: false }, null];

  const here = `/${locale}/q/${slug}`;
  return (
    <QuestionFlow
      data={data}
      community={community}
      signedIn={Boolean(profile)}
      isAdmin={Boolean(profile?.is_admin)}
      configured={isSupabaseConfigured}
      aiConfigured={isAiConfigured}
      aiRemaining={aiRemaining}
      nickname={profile?.nickname ?? null}
      loginHref={`/login?next=${encodeURIComponent(here)}`}
    />
  );
}
