"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { generateInsight } from "@/lib/ai/insight";
import type { InsightError } from "@/lib/ai/types";

/** Admin-only "Generate AI Insight now" button. */
export async function generateInsightNow(input: { questionId: string }): Promise<{ ok: true } | { ok: false; error: InsightError }> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return { ok: false, error: "forbidden" };
  if (!z.uuid().safeParse(input.questionId).success) return { ok: false, error: "failed" };

  const result = await generateInsight(input.questionId);
  if (result.ok) revalidatePath("/[locale]/q/[slug]", "page");
  return result;
}
