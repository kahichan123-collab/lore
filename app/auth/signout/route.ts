import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const form = await request.formData();
  const requested = form.get("locale");
  const locale = typeof requested === "string" && hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  // 303 so the browser follows with GET.
  return NextResponse.redirect(new URL(`/${locale}`, request.nextUrl.origin), 303);
}
