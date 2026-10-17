import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { LangToggle } from "./LangToggle";
import { Wordmark } from "./Wordmark";

const navLink = "rounded px-2 py-1 text-sm text-ink-soft hover:text-ink";

export async function Header() {
  const t = await getTranslations();
  const locale = await getLocale();
  const profile = await getCurrentProfile();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label={t("brand.home")} className="shrink-0">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <Link href="/library" className={navLink}>{t("nav.library")}</Link>
          {profile?.is_admin && <Link href="/admin" className={navLink}>{t("nav.admin")}</Link>}
          {profile ? (
            <>
              <Link href="/me" className={navLink}>{t("nav.me")}</Link>
              <form action="/auth/signout" method="post">
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className={navLink}>{t("nav.signOut")}</button>
              </form>
            </>
          ) : (
            <Link href="/login" className={navLink}>{t("nav.signIn")}</Link>
          )}
          <Suspense>
            <LangToggle />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
