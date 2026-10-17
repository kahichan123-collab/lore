import type { Metadata } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { routing } from "@/i18n/routing";
import "../globals.css";

const serif = Noto_Serif_TC({
  variable: "--font-noto-serif",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const sans = Noto_Sans_TC({
  variable: "--font-noto-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const tagline = await getTranslations({ locale, namespace: "brand" });
  return {
    metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
    title: { default: `${t("title")} · ${tagline("tagline")}`, template: `%s · ${t("title")}` },
    description: t("description"),
    alternates: { languages: { "zh-HK": "/zh-HK", en: "/en" } },
    openGraph: {
      siteName: t("title"),
      title: `${t("title")} · ${tagline("tagline")}`,
      description: t("description"),
      locale: locale === "en" ? "en_US" : "zh_HK",
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
