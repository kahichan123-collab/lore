"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/admin", key: "dashboard" },
  { href: "/admin/content", key: "content" },
  { href: "/admin/moderation", key: "moderation" },
] as const;

export function AdminTabs() {
  const t = useTranslations("admin.tabs");
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 border-b border-line">
      {TABS.map((tab) => {
        const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${active ? "border-accent-strong font-medium" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
