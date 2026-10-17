import { describe, expect, it } from "vitest";
import { parseDateRange } from "@/lib/date-range";

describe("parseDateRange", () => {
  it("interprets dates in Hong Kong time and makes the end exclusive", () => {
    const range = parseDateRange("2026-10-01", "2026-10-31");
    expect(range.invalid).toBe(false);
    expect(range.fromIso).toBe("2026-09-30T16:00:00.000Z");
    // 1 November 00:00 Hong Kong = 31 October 16:00 UTC
    expect(range.toIso).toBe("2026-10-31T16:00:00.000Z");
  });

  it("allows an open-ended range", () => {
    const range = parseDateRange(null, "2026-10-31");
    expect(range.fromIso).toBeNull();
    expect(range.toIso).toBe("2026-10-31T16:00:00.000Z");
  });

  it("rejects impossible dates and reversed ranges", () => {
    expect(parseDateRange("2026-02-30", null).invalid).toBe(true);
    expect(parseDateRange("2026-10-31", "2026-10-01").invalid).toBe(true);
    expect(parseDateRange("not-a-date", null).invalid).toBe(true);
  });
});
