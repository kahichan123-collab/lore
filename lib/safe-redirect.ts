import { routing } from "@/i18n/routing";

/**
 * Only allow same-site relative paths ("/zh-HK/q/…"), never "//evil.com" or
 * "https://…", so sign-in links can't be turned into open redirects.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next === "string" && /^\/(?![/\\])[^\s]*$/.test(next)) return next;
  return `/${routing.defaultLocale}`;
}
