import { getTranslations, setRequestLocale } from "next-intl/server";
import { InsightButton } from "@/components/admin/InsightButton";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/admin";
import { RATE_KEYS, TARGETS, formatPercent, normalizeRow, rates, type AnalyticsRow } from "@/lib/analytics";
import { isSupabaseConfigured } from "@/lib/env";
import { pick } from "@/lib/i18n-content";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
    </div>
  );
}

function Target({ label, value, goal, percent = false }: { label: string; value: number; goal: number; percent?: boolean }) {
  const progress = Math.min(1, goal ? value / goal : 0);
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-ink-soft">{percent ? `${formatPercent(value)} / ${formatPercent(goal)}` : `${value} / ${goal}`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-label={label} aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${progress >= 1 ? "bg-accent-strong" : "bg-accent"}`} style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

export default async function AdminDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isSupabaseConfigured) return null;

  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin.dashboard");

  const [analytics, users, questions, insights] = await Promise.all([
    supabase.rpc("admin_analytics"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("questions").select("id, slug, question_zh, question_en, status").order("created_at"),
    supabase.from("ai_insights").select("question_id"),
  ]);
  if (analytics.error) throw analytics.error;

  const rows = (analytics.data as Record<string, unknown>[]).map(normalizeRow);
  const empty = normalizeRow({ question_id: null });
  const total: AnalyticsRow = rows.find((r) => r.question_id === null) ?? empty;
  const byQuestion = new Map(rows.filter((r) => r.question_id).map((r) => [r.question_id!, r]));
  const totalRates = rates(total);
  const reflectionCount = rows.filter((r) => r.question_id).reduce((sum, r) => sum + r.reflected, 0);
  const withInsight = new Set((insights.data ?? []).map((i) => i.question_id as string));
  const avg = (v: number | null) => (v === null ? "—" : v.toFixed(2));

  return (
    <div className="space-y-12">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("users")} value={users.count ?? 0} />
        <Stat label={t("visitors")} value={total.visitors} />
        <Stat label={t("opened")} value={total.opened_text} />
        <Stat label={t("finished")} value={total.finished_text} />
        <Stat label={t("reflected")} value={reflectionCount} />
        <Stat label={t("feedback")} value={total.feedback_count} />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="rates">
          <h2 id="rates" className="font-serif text-xl">{t("rates")}</h2>
          <dl className="mt-4 divide-y divide-line rounded-lg border border-line bg-card">
            {RATE_KEYS.map((key) => (
              <div key={key} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt>
                  <span className="text-sm">{t(`rate.${key}`)}</span>
                  <span className="block text-xs text-ink-soft">{t(`rateHelp.${key}`)}</span>
                </dt>
                <dd className="font-serif text-2xl">{formatPercent(totalRates[key])}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-8">
          <section aria-labelledby="targets">
            <h2 id="targets" className="font-serif text-xl">{t("targets")}</h2>
            <div className="mt-4 space-y-4 rounded-lg border border-line bg-card p-4">
              <Target label={t("target.reach")} value={total.visitors} goal={TARGETS.reach} />
              <Target label={t("target.finish")} value={total.finished_text} goal={TARGETS.finish} />
              <Target label={t("target.reflections")} value={reflectionCount} goal={TARGETS.reflections} />
              <Target label={t("target.feedback")} value={totalRates.feedback ?? 0} goal={TARGETS.feedbackRate} percent />
            </div>
          </section>

          <section aria-labelledby="satisfaction">
            <h2 id="satisfaction" className="font-serif text-xl">{t("satisfaction")}</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat label={t("avgRating")} value={avg(total.avg_rating)} />
              <Stat label={t("avgAiHelped")} value={avg(total.avg_ai_helped)} />
              <Stat label={t("avgOwnView")} value={avg(total.avg_own_view)} />
            </div>
          </section>

          <section aria-labelledby="export">
            <h2 id="export" className="font-serif text-xl">{t("export")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["summary", "events", "feedback"] as const).map((type) => (
                <a key={type} href={`/api/admin/export?type=${type}`} className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent" download>
                  {t(type === "summary" ? "exportSummary" : type === "events" ? "exportEvents" : "exportFeedback")} ↓
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section aria-labelledby="per-question">
        <h2 id="per-question" className="font-serif text-xl">{t("perQuestion")}</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-line text-left text-xs text-ink-soft">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{t("question")}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t("visitors")}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t("finished")}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t("reflected")}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t("rate.completion")}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t("rate.aiUsage")}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t("rate.discussion")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("insight")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(questions.data ?? []).map((q) => {
                const r = byQuestion.get(q.id) ?? empty;
                const rate = rates(r);
                return (
                  <tr key={q.id}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <span className="font-serif">{pick(q, "question", locale as Locale)}</span>
                      {q.status !== "published" && <span className="ml-2 text-xs text-ink-soft">({q.status})</span>}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums">{r.visitors}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.finished_text}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.reflected}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatPercent(rate.completion)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatPercent(rate.aiUsage)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatPercent(rate.discussion)}</td>
                    <td className="px-3 py-2">
                      <InsightButton questionId={q.id} hasInsight={withInsight.has(q.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
