import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Notice } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { moderate } from "@/lib/actions/admin";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

type TargetType = "reflection" | "comment";

interface Target {
  type: TargetType;
  id: string;
  body: string | null;
  status: string | null;
  authorId: string | null;
  createdAt: string | null;
  reasons: { reason: string; createdAt: string }[];
}

function Actions({ locale, target, t }: { locale: string; target: Target; t: (key: string) => string }) {
  const hidden = target.status === "hidden";
  const actions: { action: string; label: string; danger?: boolean }[] = [
    ...(target.body !== null ? [hidden ? { action: "unhide", label: t("unhide") } : { action: "hide", label: t("hide") }] : []),
    ...(target.body !== null ? [{ action: "delete", label: t("delete"), danger: true }] : []),
    ...(target.reasons.length ? [{ action: "dismiss", label: t("dismiss") }] : []),
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map(({ action, label, danger }) => (
        <form key={action} action={moderate}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="target_type" value={target.type} />
          <input type="hidden" name="target_id" value={target.id} />
          <input type="hidden" name="action" value={action} />
          <button
            type="submit"
            className={`rounded-full border px-3 py-1 text-sm ${danger ? "border-red-800 text-red-800 hover:bg-red-50" : "border-line hover:border-accent"}`}
          >
            {label}
          </button>
        </form>
      ))}
    </div>
  );
}

export default async function Moderation({ params, searchParams }: Props) {
  const { locale } = await params;
  const { saved, error } = await searchParams;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin.moderation");
  const format = await getFormatter();

  const { data: reports } = await supabase
    .from("reports")
    .select("target_type, target_id, reason, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const reportedIds = (type: TargetType) => [...new Set((reports ?? []).filter((r) => r.target_type === type).map((r) => r.target_id as string))];
  const columns = "id, body, status, user_id, created_at";
  const [reflections, comments, hiddenReflections, hiddenComments] = await Promise.all([
    supabase.from("reflections").select(columns).in("id", reportedIds("reflection")),
    supabase.from("comments").select(columns).in("id", reportedIds("comment")),
    supabase.from("reflections").select(columns).eq("status", "hidden"),
    supabase.from("comments").select(columns).eq("status", "hidden"),
  ]);

  type Row = { id: string; body: string; status: string; user_id: string; created_at: string };
  const rowsById = new Map<string, Row>();
  for (const r of [...(reflections.data ?? []), ...(comments.data ?? []), ...(hiddenReflections.data ?? []), ...(hiddenComments.data ?? [])] as Row[]) {
    rowsById.set(r.id, r);
  }

  const toTarget = (type: TargetType, id: string): Target => {
    const row = rowsById.get(id);
    return {
      type,
      id,
      body: row?.body ?? null,
      status: row?.status ?? null,
      authorId: row?.user_id ?? null,
      createdAt: row?.created_at ?? null,
      reasons: (reports ?? [])
        .filter((r) => r.target_type === type && r.target_id === id)
        .map((r) => ({ reason: r.reason as string, createdAt: r.created_at as string })),
    };
  };

  const reported = [...reportedIds("reflection").map((id) => toTarget("reflection", id)), ...reportedIds("comment").map((id) => toTarget("comment", id))];
  const reportedSet = new Set(reported.map((r) => r.id));
  const hidden = [
    ...((hiddenReflections.data ?? []) as Row[]).map((r) => toTarget("reflection", r.id)),
    ...((hiddenComments.data ?? []) as Row[]).map((r) => toTarget("comment", r.id)),
  ].filter((r) => !reportedSet.has(r.id));

  const authorIds = [...new Set([...reported, ...hidden].map((x) => x.authorId).filter(Boolean))] as string[];
  const { data: authors } = await supabase.from("profiles").select("id, nickname").in("id", authorIds);
  const nickname = new Map((authors ?? []).map((a) => [a.id as string, a.nickname as string]));

  const card = (target: Target) => (
    <li key={`${target.type}-${target.id}`} className="rounded-lg border border-line bg-card p-4">
      <p className="flex flex-wrap gap-2 text-xs text-ink-soft">
        <span className="rounded bg-paper-deep px-1.5 py-0.5 text-ink">{t(target.type)}</span>
        {target.authorId && <span>{t("author")}: {nickname.get(target.authorId) ?? "—"}</span>}
        {target.createdAt && <span>{format.dateTime(new Date(target.createdAt), { dateStyle: "medium", timeStyle: "short" })}</span>}
        {target.status === "hidden" && <span className="text-red-800">{t("hidden")}</span>}
      </p>
      <p className="mt-2 whitespace-pre-wrap font-serif text-sm leading-relaxed">{target.body ?? t("missing")}</p>
      {target.reasons.length > 0 && (
        <div className="mt-3 rounded bg-paper-deep p-3 text-sm">
          <p className="text-xs font-medium">{t("reports", { count: target.reasons.length })}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {target.reasons.map((r, i) => <li key={i}>{r.reason}</li>)}
          </ul>
        </div>
      )}
      <Actions locale={locale} target={target} t={t} />
    </li>
  );

  return (
    <div className="space-y-10">
      <Notice saved={saved} error={error} />
      <section aria-labelledby="open-reports">
        <h2 id="open-reports" className="font-serif text-xl">{t("open")}</h2>
        {reported.length === 0 ? <p className="mt-3 text-ink-soft">{t("none")}</p> : <ul className="mt-4 space-y-4">{reported.map(card)}</ul>}
      </section>
      <section aria-labelledby="hidden-content">
        <h2 id="hidden-content" className="font-serif text-xl">{t("hidden")}</h2>
        {hidden.length === 0 ? <p className="mt-3 text-ink-soft">{t("noneHidden")}</p> : <ul className="mt-4 space-y-4">{hidden.map(card)}</ul>}
      </section>
    </div>
  );
}
