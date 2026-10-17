"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/i18n-content";
import { LIMITS } from "@/lib/text";
import { track } from "@/lib/track";
import type { CommunityData } from "@/lib/question";
import type { OwnReflection, QuestionPageData } from "@/lib/types";
import { CommunityFeed } from "./CommunityFeed";
import { CompanionPanel } from "./CompanionPanel";
import { ExcerptReader } from "./ExcerptReader";
import { FeedbackForm } from "./FeedbackForm";
import { InitialAnswer } from "./InitialAnswer";
import { InsightPanel } from "./InsightPanel";
import { Progress } from "./Progress";
import { ReflectionEditor } from "./ReflectionEditor";

type Stage = "question" | "text" | "reflection" | "unlocked";

/** Index into STEPS for the progress bar. */
const PROGRESS: Record<Stage, number> = { question: 0, text: 1, reflection: 3, unlocked: 5 };

const isSubmitted = (mine: OwnReflection | null) => mine?.status === "published" || mine?.status === "hidden";

/** Where a returning reader picks up. */
function initialStage(mine: OwnReflection | null): Stage {
  if (isSubmitted(mine)) return "unlocked";
  if (mine?.body) return "reflection";
  if (mine) return "text";
  return "question";
}

export function QuestionFlow({
  data,
  community,
  signedIn,
  isAdmin,
  configured,
  aiConfigured,
  aiRemaining,
  nickname,
  loginHref,
}: {
  data: QuestionPageData;
  community: CommunityData;
  signedIn: boolean;
  isAdmin: boolean;
  configured: boolean;
  aiConfigured: boolean;
  aiRemaining: number | null;
  nickname: string | null;
  loginHref: string;
}) {
  const { question, excerpt, classic, reflectionCount } = data;
  const { mine, feed, comments, insight } = community;
  const t = useTranslations("question");
  const locale = useLocale() as Locale;
  const [stage, setStage] = useState<Stage>(() => initialStage(mine));
  const [firstThought, setFirstThought] = useState(mine?.initial_answer ?? "");
  const [showText, setShowText] = useState(false);
  const headings = useRef<Partial<Record<Stage, HTMLHeadingElement | null>>>({});
  const mounted = useRef(false);

  // Submitting re-renders the page with the reader's published reflection.
  const submitted = isSubmitted(mine);
  useEffect(() => {
    if (submitted) setStage("unlocked");
  }, [submitted]);

  useEffect(() => track("view_question", question.id), [question.id]);
  useEffect(() => {
    if (stage === "text") track("open_text", question.id);
  }, [stage, question.id]);

  // Move focus to the new step so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const heading = headings.current[stage];
    heading?.focus();
    heading?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

  const headingRef = (s: Stage) => (el: HTMLHeadingElement | null) => {
    headings.current[s] = el;
  };
  const h2 = "scroll-mt-6 font-serif text-2xl outline-none";
  const textVisible = stage === "text" || showText;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Progress current={stage === "unlocked" && insight ? 6 : PROGRESS[stage]} />

      {!configured && (
        <p role="status" className="mt-4 rounded border border-line bg-paper-deep px-3 py-2 text-sm text-ink-soft">{t("demo")}</p>
      )}

      <header className="mx-auto max-w-3xl py-10 text-center sm:py-14">
        {classic && (
          <p className="text-sm text-ink-soft">
            {locale === "en" ? classic.title_en : `《${classic.title_zh}》`} · {pick(classic, "author", locale)}
          </p>
        )}
        <h1 className="mt-3 font-serif text-3xl leading-snug sm:text-5xl">{pick(question, "question", locale)}</h1>
      </header>

      <div className="mx-auto max-w-3xl">
        {stage === "question" ? (
          <InitialAnswer
            questionId={question.id}
            initial={firstThought}
            signedIn={signedIn}
            configured={configured}
            loginHref={loginHref}
            onDone={(text) => {
              setFirstThought(text);
              setStage("text");
            }}
          />
        ) : (
          firstThought && (
            <figure className="rounded-lg border-l-2 border-accent bg-card px-4 py-3">
              <figcaption className="text-xs text-ink-soft">{t("firstThought.saved")}</figcaption>
              <blockquote className="mt-1 whitespace-pre-wrap font-serif">{firstThought}</blockquote>
            </figure>
          )
        )}
      </div>

      {stage !== "question" && !excerpt && (
        <p className="mx-auto mt-8 max-w-3xl rounded-lg border border-dashed border-line p-6 text-center text-ink-soft">
          {t("text.comingSoon")}
        </p>
      )}

      {stage !== "question" && excerpt && (
        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-12">
            <section aria-labelledby="step-text">
              <div className="flex items-center justify-between gap-3">
                <h2 id="step-text" ref={headingRef("text")} tabIndex={-1} className={h2}>{t("text.title")}</h2>
                {stage !== "text" && (
                  <button type="button" onClick={() => setShowText((v) => !v)} aria-expanded={showText} aria-controls="excerpt" className="text-sm text-accent-strong underline underline-offset-4">
                    {showText ? t("text.hide") : t("text.reread")}
                  </button>
                )}
              </div>
              {textVisible && (
                <div className="mt-4">
                  <ExcerptReader excerpt={excerpt} classic={classic} />
                </div>
              )}
              {stage === "text" && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      track("finish_text", question.id);
                      setStage("reflection");
                    }}
                    className="rounded-full bg-accent-strong px-6 py-3 font-medium text-paper hover:bg-ink"
                  >
                    {t("text.finished")}
                  </button>
                </div>
              )}
            </section>

            {stage === "reflection" && (
              <section aria-labelledby="step-reflection">
                <h2 id="step-reflection" ref={headingRef("reflection")} tabIndex={-1} className={h2}>{t("reflection.title")}</h2>
                <p className="mt-2 leading-relaxed text-ink-soft">{t("reflection.hint", { min: LIMITS.reflectionMin })}</p>
                <div className="mt-4">
                  <ReflectionEditor
                    questionId={question.id}
                    mine={mine}
                    signedIn={signedIn}
                    configured={configured}
                    nickname={nickname}
                    loginHref={loginHref}
                  />
                  {!submitted && (
                    <p className="mt-4 rounded-lg border border-dashed border-line bg-paper-deep px-4 py-3 text-sm text-ink-soft">
                      {t("unlock.locked", { count: reflectionCount })}
                    </p>
                  )}
                </div>
              </section>
            )}

            {stage === "unlocked" && (
              <section aria-labelledby="step-unlocked">
                <h2 id="step-unlocked" ref={headingRef("unlocked")} tabIndex={-1} className={h2}>{t("unlock.title")}</h2>
                {mine?.status === "hidden" && (
                  <div className="mt-4 rounded-lg border border-line bg-paper-deep p-4 text-sm">
                    <p className="font-medium">{t("reflection.hiddenNotice")}</p>
                    <p className="mt-2 whitespace-pre-wrap font-serif text-ink-soft">{mine.body}</p>
                  </div>
                )}
                <div className="mt-4">
                  <CommunityFeed
                    questionId={question.id}
                    feed={feed}
                    comments={comments}
                    total={community.total}
                    hasMore={community.hasMore}
                  />
                </div>
              </section>
            )}

            {stage === "unlocked" && (
              <section aria-labelledby="step-insight">
                <h2 id="step-insight" className={h2}>{t("insight.title")}</h2>
                <div className="mt-4">
                  <InsightPanel questionId={question.id} insight={insight} isAdmin={isAdmin} />
                </div>
              </section>
            )}

            {stage === "unlocked" && !community.hasFeedback && <FeedbackForm questionId={question.id} />}
          </div>

          <div className="mt-10 lg:mt-0">
            <CompanionPanel
              questionId={question.id}
              signedIn={signedIn}
              configured={configured && aiConfigured}
              initialRemaining={aiRemaining}
              loginHref={loginHref}
            />
          </div>
        </div>
      )}
    </div>
  );
}
