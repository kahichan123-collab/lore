import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_DAILY_LIMIT } from "./client";
import { remainingFromCount } from "./limit";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many AI Companion questions the user has left in the last 24 hours. */
export async function remainingAiQuestions(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from("ai_messages_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - DAY_MS).toISOString());
  return remainingFromCount(count, AI_DAILY_LIMIT);
}
