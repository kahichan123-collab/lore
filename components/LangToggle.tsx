"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";

export function LangToggle() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const other = locale === "en" ? "zh-HK" : "en";

  return (
    <Link
      href={search ? `${pathname}?${search}` : pathname}
      locale={other}
      hrefLang={other}
      aria-label={`${t("language")}: ${t("switchTo")}`}
      className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent hover:text-accent-strong"
    >
      {t("switchTo")}
    </Link>
  );
}
