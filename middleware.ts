import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18n = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  return updateSession(request, handleI18n(request));
}

export const config = {
  // Everything except API routes, the auth callback, Next internals and files.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
