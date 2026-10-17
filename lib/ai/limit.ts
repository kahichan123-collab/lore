// Pure daily-limit maths, kept free of server-only imports so it can be
// tested without a database or an AI key.

export function remainingFromCount(count: number | null | undefined, limit: number): number {
  const used = Math.max(0, Number(count) || 0);
  return Math.max(0, Math.floor(limit) - used);
}
