import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { generateInsight } from "@/lib/ai/insight";
import { getCurrentProfile } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai/client";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({ questionId: z.uuid() });

/**
 * Admin-only on-demand AI Insight. The admin button uses a server action with
 * the same guard; this route exists for scripts and for parity with the brief.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !isAiConfigured) {
    return NextResponse.json({ error: "notConfigured" }, { status: 503 });
  }

  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "signIn" }, { status: 401 });
  if (!profile.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const result = await generateInsight(parsed.data.questionId);
  if (result.ok) return NextResponse.json({ ok: true });
  const status = result.error === "notEnough" ? 409 : result.error === "forbidden" ? 403 : 500;
  return NextResponse.json({ error: result.error }, { status });
}
