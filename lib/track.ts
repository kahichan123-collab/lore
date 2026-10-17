"use client";

import { trackEvent } from "@/lib/actions/question";
import { isSupabaseConfigured } from "@/lib/env";

const KEY = "lore_anon_id";

function anonId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Fire-and-forget reading-progress event. */
export function track(type: "view_question" | "open_text" | "finish_text", questionId: string) {
  if (!isSupabaseConfigured) return;
  trackEvent({ type, questionId, anonId: anonId() }).catch(() => {});
}
