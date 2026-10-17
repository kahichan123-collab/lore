import { NextResponse, type NextRequest } from "next/server";
import { generateInsight, questionsNeedingInsight } from "@/lib/ai/insight";

export const runtime = "nodejs";
export const maxDuration = 300;

// Called weekly by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET`; anyone else is rejected.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ids = await questionsNeedingInsight();
  const results: Record<string, string> = {};
  for (const id of ids) {
    const result = await generateInsight(id);
    results[id] = result.ok ? "ok" : result.error;
  }
  return NextResponse.json({ generated: results });
}
