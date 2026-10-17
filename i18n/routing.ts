import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh-HK", "en"],
  defaultLocale: "zh-HK",
});

export type Locale = (typeof routing.locales)[number];
