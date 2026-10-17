import { getTranslations } from "next-intl/server";

// Small building blocks for the admin forms.

export const inputClass = "w-full rounded border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent-strong";
export const buttonClass = "rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-accent-strong";

/** Shows ?saved=1 / ?error=… left by an admin form action. */
export async function Notice({ saved, error }: { saved?: string; error?: string }) {
  const t = await getTranslations("admin.content");
  if (error) {
    return <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{t("error", { message: error })}</p>;
  }
  if (saved) return <p role="status" className="rounded border border-line bg-paper-deep px-3 py-2 text-sm">{t("saved")}</p>;
  return null;
}

export function Field({
  label,
  name,
  defaultValue,
  multiline = false,
  rows = 3,
  required = false,
  lang,
  pattern,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  lang?: string;
  pattern?: string;
}) {
  const id = `field-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {multiline ? (
        <textarea id={id} name={name} defaultValue={defaultValue ?? ""} rows={rows} required={required} lang={lang} className={`${inputClass} font-serif leading-relaxed`} />
      ) : (
        <input id={id} name={name} defaultValue={defaultValue ?? ""} required={required} lang={lang} pattern={pattern} className={inputClass} />
      )}
    </div>
  );
}
