import { describe, expect, it } from "vitest";
import { parseCsv, parseImportJson, parseQuestionCsv } from "@/lib/content/import";

describe("parseImportJson", () => {
  it("accepts a valid file", () => {
    const result = parseImportJson(JSON.stringify({
      classics: [{ slug: "test", title_zh: "測試", title_en: "Test", author_zh: "作者", author_en: "Author" }],
      excerpts: [{ classic_slug: "test", text_en: "Hello", source_note: "Public domain — https://www.gutenberg.org/ebooks/1" }],
      questions: [{ slug: "q", question_zh: "問題", question_en: "Question", classic_slug: "test" }],
    }));
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON, bad slugs and empty files", () => {
    expect(parseImportJson("nope").ok).toBe(false);
    expect(parseImportJson(JSON.stringify({ classics: [{ slug: "Bad Slug" }] })).ok).toBe(false);
    expect(parseImportJson(JSON.stringify({})).ok).toBe(false);
    expect(parseImportJson(JSON.stringify({
      excerpts: [{ classic_slug: "test", text_en: "Hello", source_note: "No link" }],
    })).ok).toBe(false);
  });
});

describe("parseQuestionCsv", () => {
  it("parses quoted fields, tags and booleans", () => {
    const csv = [
      "slug,question_zh,question_en,tags,difficulty,classic_slug,status,featured",
      'who,誰,"Who, really?",politics|power,2,republic,published,true',
    ].join("\n");
    const result = parseQuestionCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]).toMatchObject({
      slug: "who",
      question_en: "Who, really?",
      tags: ["politics", "power"],
      difficulty: 2,
      classic_slug: "republic",
      status: "published",
      featured: true,
    });
  });

  it("reports a missing column and a bad row", () => {
    expect(parseQuestionCsv("slug,question_en\nx,Hello").ok).toBe(false);
    expect(parseQuestionCsv("slug,question_zh,question_en\nx,問題,Question\n,空白,Blank").ok).toBe(false);
  });
});

describe("parseCsv", () => {
  it("handles escaped quotes and CRLF", () => {
    expect(parseCsv('a,b\r\n"x ""y""",z\r\n')).toEqual([["a", "b"], ['x "y"', "z"]]);
  });
});
