import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p className="font-serif">{t("brand.tagline")}</p>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-ink">{t("footer.privacy")}</Link>
          <Link href="/guidelines" className="hover:text-ink">{t("footer.guidelines")}</Link>
        </div>
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-8 text-xs text-ink-soft">{t("footer.copyright")}</p>
    </footer>
  );
}
