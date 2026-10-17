import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { RATE_KEYS, normalizeRow, rates } from "@/lib/analytics";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PAGE = 1000;
const MAX_ROWS = 100_000;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Reads a whole table in pages (Supabase returns at most 1,000 rows per request). */
async function allRows<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function questionSlugs(supabase: Supabase) {
  const { data } = await supabase.from("questions").select("id, slug, question_en");
  return new Map((data ?? []).map((q) => [q.id as string, q as { slug: string; question_en: string }]));
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const type = request.nextUrl.searchParams.get("type");
  const supabase = await createClient();
  const questions = await questionSlugs(supabase);
  const slugOf = (id: string | null) => (id ? questions.get(id)?.slug ?? id : "");
  let csv: string;

  if (type === "summary") {
    const { data, error } = await supabase.rpc("admin_analytics");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = (data as Record<string, unknown>[]).map(normalizeRow);
    csv = toCsv(
      ["question", "question_en", "visitors", "opened_text", "finished_text", "asked_ai", "reflected", "unlocked", "commented", "feedback_count",
        ...RATE_KEYS.map((k) => `${k}_rate`), "avg_rating", "avg_ai_helped", "avg_own_view"],
      rows.map((r) => {
        const rate = rates(r);
        return [
          r.question_id ? slugOf(r.question_id) : "ALL",
          r.question_id ? questions.get(r.question_id)?.question_en ?? "" : "",
          r.visitors, r.opened_text, r.finished_text, r.asked_ai, r.reflected, r.unlocked, r.commented, r.feedback_count,
          ...RATE_KEYS.map((k) => (rate[k] === null ? null : Math.round(rate[k]! * 10000) / 10000)),
          r.avg_rating, r.avg_ai_helped, r.avg_own_view,
        ];
      }),
    );
  } else if (type === "events") {
    const rows = await allRows<{ created_at: string; type: string; question_id: string | null; user_id: string | null; anon_id: string | null }>(
      (from, to) => supabase.from("events").select("created_at, type, question_id, user_id, anon_id").order("created_at").range(from, to),
    );
    csv = toCsv(
      ["created_at", "type", "question", "person", "signed_in"],
      rows.map((e) => [e.created_at, e.type, slugOf(e.question_id), e.user_id ?? e.anon_id, e.user_id !== null]),
    );
  } else if (type === "feedback") {
    const rows = await allRows<{ created_at: string; question_id: string | null; rating: number; ai_helped: number | null; own_view: number | null; comment: string | null }>(
      (from, to) => supabase.from("feedback").select("created_at, question_id, rating, ai_helped, own_view, comment").order("created_at").range(from, to),
    );
    csv = toCsv(
      ["created_at", "question", "rating", "ai_helped", "own_view", "comment"],
      rows.map((f) => [f.created_at, slugOf(f.question_id), f.rating, f.ai_helped, f.own_view, f.comment]),
    );
  } else {
    return NextResponse.json({ error: "type must be summary, events or feedback" }, { status: 400 });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lore-${type}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
