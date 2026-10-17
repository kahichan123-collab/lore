import { describe, expect, it } from "vitest";
import { formatPercent, normalizeRow, rates } from "@/lib/analytics";
import { toCsv } from "@/lib/csv";

describe("rates", () => {
  it("computes each funnel rate from distinct-person counts", () => {
    const row = normalizeRow({
      question_id: null,
      visitors: "500", opened_text: "400", finished_text: "300", asked_ai: "200",
      reflected: "240", unlocked: "240", commented: "60", feedback_count: "36",
      avg_rating: "4.25", avg_ai_helped: null, avg_own_view: "3.9",
    });
    const r = rates(row);
    expect(r.completion).toBe(0.75);
    expect(r.aiUsage).toBe(0.5);
    expect(r.reflection).toBe(0.8);
    expect(r.unlock).toBe(0.6);
    expect(r.discussion).toBe(0.25);
    expect(r.feedback).toBe(0.15);
    expect(row.avg_rating).toBe(4.25);
    expect(row.avg_ai_helped).toBeNull();
  });

  it("returns null instead of dividing by zero", () => {
    const r = rates(normalizeRow({ question_id: null }));
    expect(r.completion).toBeNull();
    expect(formatPercent(r.completion)).toBe("—");
    expect(formatPercent(0.666)).toBe("67%");
  });
});

describe("toCsv", () => {
  it("quotes commas, quotes and newlines, and starts with a UTF-8 BOM", () => {
    const csv = toCsv(["a", "b"], [["誰應該統治？", 'he said "hi", then\nleft']]);
    expect(csv).toBe('﻿a,b\r\n誰應該統治？,"he said ""hi"", then\nleft"\r\n');
  });

  it("neutralises spreadsheet formulas in text cells", () => {
    const csv = toCsv(["x"], [["=HYPERLINK(\"evil\")"], ["+1"], ["-cmd"], ["@SUM(A1)"], [-5]]);
    const lines = csv.slice(1).trim().split("\r\n").slice(1);
    expect(lines).toEqual([`"'=HYPERLINK(""evil"")"`, "'+1", "'-cmd", "'@SUM(A1)", "-5"]);
  });
});
