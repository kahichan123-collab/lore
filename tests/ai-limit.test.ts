import { describe, expect, it } from "vitest";
import { remainingFromCount } from "@/lib/ai/limit";

describe("remainingFromCount", () => {
  it("returns the full limit for a new reader", () => {
    expect(remainingFromCount(0, 20)).toBe(20);
    expect(remainingFromCount(null, 20)).toBe(20);
  });

  it("subtracts used calls and never goes negative", () => {
    expect(remainingFromCount(19, 20)).toBe(1);
    expect(remainingFromCount(20, 20)).toBe(0);
    expect(remainingFromCount(25, 20)).toBe(0);
  });

  it("treats malformed counts as zero", () => {
    expect(remainingFromCount(Number.NaN, 20)).toBe(20);
    expect(remainingFromCount(-4, 20)).toBe(20);
  });
});
