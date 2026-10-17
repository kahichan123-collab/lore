import { getTranslations } from "next-intl/server";
import { STEPS } from "./steps";

/** The seven steps of LORE, as a horizontal flow (wraps on small screens). */
export async function StepFlow() {
  const t = await getTranslations("steps");
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {STEPS.map((step, i) => (
        <li key={step} className="relative flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-3 lg:flex-col lg:gap-2 lg:text-center">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-accent font-serif text-sm text-accent-strong"
          >
            {i + 1}
          </span>
          <span className="text-sm font-medium">{t(step)}</span>
        </li>
      ))}
    </ol>
  );
}
