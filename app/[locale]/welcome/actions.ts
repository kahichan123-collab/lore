"use server";

import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentProfile } from "@/lib/auth";
import { containsProfanity } from "@/lib/moderation";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { charCount, cleanText } from "@/lib/text";

export type WelcomeState =
  | { status: "idle" }
  | { status: "error"; error: "invalid" | "profanity" | "generic" };

export async function chooseNickname(_prev: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${routing.defaultLocale}/login`);

  const nickname = cleanText(String(formData.get("nickname") ?? "")).replace(/\s+/g, " ");
  if (charCount(nickname) < 1 || charCount(nickname) > 30) return { status: "error", error: "invalid" };
  if (containsProfanity(nickname)) return { status: "error", error: "profanity" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nickname, nickname_chosen: true })
    .eq("id", profile.id);
  if (error) {
    console.error("chooseNickname:", error.message);
    return { status: "error", error: "generic" };
  }

  redirect(safeNextPath(formData.get("next")));
}
