"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { isSupabaseConfigured } from "@/lib/env";
import { containsProfanity } from "@/lib/moderation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { charCount, cleanText } from "@/lib/text";

export type ProfileState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; error: "invalid" | "profanity" | "confirm" | "notConfigured" | "generic" };

async function currentUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const ctx = await currentUser();
  if (!ctx) return { status: "error", error: "generic" };

  const nickname = cleanText(String(formData.get("nickname") ?? "")).replace(/\s+/g, " ");
  const language = z.enum(routing.locales).safeParse(formData.get("language"));
  if (!language.success || charCount(nickname) < 1 || charCount(nickname) > 30) return { status: "error", error: "invalid" };
  if (containsProfanity(nickname)) return { status: "error", error: "profanity" };

  const { error } = await ctx.supabase.from("profiles").update({ nickname, language: language.data, nickname_chosen: true }).eq("id", ctx.user.id);
  if (error) {
    console.error("updateProfile:", error.message);
    return { status: "error", error: "generic" };
  }

  revalidatePath("/[locale]", "layout");
  const current = String(formData.get("currentLocale") ?? "");
  if (current !== language.data) redirect(`/${language.data}/me`);
  return { status: "saved" };
}

export async function deleteMyReflection(input: { reflectionId: string }): Promise<{ ok: boolean }> {
  const ctx = await currentUser();
  if (!ctx || !z.uuid().safeParse(input.reflectionId).success) return { ok: false };
  const { error } = await ctx.supabase.from("reflections").delete().eq("id", input.reflectionId).eq("user_id", ctx.user.id);
  if (error) return { ok: false };
  revalidatePath("/[locale]/me", "page");
  return { ok: true };
}

/**
 * Deletes the auth user; the database cascades to their profile, reflections,
 * comments, likes and feedback. Events keep no link to them (user_id → null).
 */
export async function deleteAccount(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const ctx = await currentUser();
  if (!ctx) return { status: "error", error: "generic" };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { status: "error", error: "notConfigured" };

  const expected = String(formData.get("expected") ?? "");
  if (!expected || String(formData.get("confirm") ?? "").trim() !== expected) return { status: "error", error: "confirm" };

  const { error } = await createAdminClient().auth.admin.deleteUser(ctx.user.id);
  if (error) {
    console.error("deleteAccount:", error.message);
    return { status: "error", error: "generic" };
  }
  await ctx.supabase.auth.signOut();

  const locale = z.enum(routing.locales).catch(routing.defaultLocale).parse(formData.get("currentLocale"));
  redirect(`/${locale}`);
}
