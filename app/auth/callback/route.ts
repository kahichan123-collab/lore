import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

// The magic-link email points here with a one-time `code`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  let next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Open the site in the reader's saved language.
      const { data: profile } = await supabase.from("profiles").select("language").eq("id", data.user.id).maybeSingle();
      const preferred = profile?.language;
      const [, current] = next.split("/");
      if (preferred && hasLocale(routing.locales, preferred) && hasLocale(routing.locales, current) && current !== preferred) {
        next = next.replace(`/${current}`, `/${preferred}`);
      }
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const locale = next.split("/")[1] || routing.defaultLocale;
  return NextResponse.redirect(new URL(`/${locale}/login?error=callback`, origin));
}
