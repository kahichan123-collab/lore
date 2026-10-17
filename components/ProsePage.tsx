import { getTranslations } from "next-intl/server";

/** A simple titled page of sections, with all text from the messages files. */
export async function ProsePage({ namespace }: { namespace: "privacy" | "guidelines" }) {
  const t = await getTranslations(namespace);
  const sections = t.raw("sections") as { title: string; body: string }[];

  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-3xl">{t("title")}</h1>
      {t.has("intro") && <p className="mt-3 leading-relaxed text-ink-soft">{t("intro")}</p>}
      {t.has("updated") && <p className="mt-2 text-sm text-ink-soft">{t("updated")}</p>}
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-serif text-xl">{s.title}</h2>
            <p className="mt-2 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
