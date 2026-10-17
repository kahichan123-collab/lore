// Shared text rules for everything users write. The database enforces the
// same limits (see 0001_schema.sql); these give friendly errors first.

export const LIMITS = {
  initialMax: 500,
  reflectionMin: 50,
  reflectionMax: 1500,
  commentMax: 1000,
  reportMax: 500,
} as const;

// Control characters, zero-width and bidi-override characters (used to spoof text).
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;

/**
 * Normalises user text before it is stored. Text is always rendered as plain
 * text (React escapes it), never as HTML, so this is about tidiness and
 * spoofing, not XSS.
 */
export function cleanText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Characters as Postgres `char_length` counts them (code points, so 一 = 1). */
export function charCount(text: string): number {
  return Array.from(text).length;
}
