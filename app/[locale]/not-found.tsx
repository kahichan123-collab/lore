import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-serif text-3xl">{t("title")}</h1>
      <p className="mt-3 text-ink-soft">{t("body")}</p>
      <Link href="/" className="mt-8 inline-block text-accent-strong underline underline-offset-4">
        {t("home")}
      </Link>
    </div>
  );
}
