"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; error: "invalidEmail" | "error" | "notConfigured" };

const schema = z.object({
  email: z.email().max(254),
  next: z.string().optional(),
});

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured) return { status: "error", error: "notConfigured" };

  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { status: "error", error: "invalidEmail" };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const next = safeNextPath(parsed.data.next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    console.error("signInWithOtp failed:", error.message);
    return { status: "error", error: "error" };
  }
  return { status: "sent", email: parsed.data.email };
}
