import { describe, expect, it } from "vitest";
import { SEED_CLASSICS, SEED_EXCERPTS, SEED_QUESTIONS } from "@/lib/content/seed-data";

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

describe("seed content", () => {
  it("has 8 classics, 8 excerpts and 20 questions", () => {
    expect(SEED_CLASSICS).toHaveLength(8);
    expect(SEED_EXCERPTS).toHaveLength(8);
    expect(SEED_QUESTIONS).toHaveLength(20);
  });

  it("uses unique slugs", () => {
    expect(new Set(SEED_CLASSICS.map((c) => c.slug)).size).toBe(8);
    expect(new Set(SEED_QUESTIONS.map((q) => q.slug)).size).toBe(20);
  });

  it("links every question to a real excerpt and 2–3 questions per classic", () => {
    const classicSlugs = new Set(SEED_CLASSICS.map((c) => c.slug));
    for (const question of SEED_QUESTIONS) {
      expect(question.excerpt_classic_slug).not.toBeNull();
      expect(classicSlugs.has(question.excerpt_classic_slug!)).toBe(true);
    }
    for (const slug of classicSlugs) {
      const count = SEED_QUESTIONS.filter((q) => q.excerpt_classic_slug === slug).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it("cites a public-domain source with a link for every excerpt", () => {
    for (const excerpt of SEED_EXCERPTS) {
      expect(excerpt.source_note).toMatch(/https:\/\/www\.gutenberg\.org\/ebooks\/\d+/);
      expect(excerpt.license_note).toMatch(/public domain/i);
      expect(excerpt.text_en.length).toBeGreaterThan(0);
      expect(excerpt.text_zh.length).toBeGreaterThan(0);
    }
  });

  it("keeps English excerpts at a readable length", () => {
    for (const excerpt of SEED_EXCERPTS) {
      const words = wordCount(excerpt.text_en);
      expect(words).toBeGreaterThanOrEqual(80);
      expect(words).toBeLessThanOrEqual(450);
    }
  });

  it("marks Western Chinese text as an original summary, not a translation", () => {
    const western = ["republic", "politics", "leviathan", "social-contract", "on-liberty", "the-prince"];
    for (const excerpt of SEED_EXCERPTS.filter((e) => western.includes(e.classic_slug))) {
      expect(excerpt.text_zh_is_summary).toBe(true);
      expect(excerpt.translator).toMatch(/中文為古問自撰摘要/);
    }
    for (const excerpt of SEED_EXCERPTS.filter((e) => ["analects", "mencius"].includes(e.classic_slug))) {
      expect(excerpt.text_zh_is_summary).toBe(false);
    }
  });

  it("has six featured questions, enough for the home page", () => {
    expect(SEED_QUESTIONS.filter((q) => q.featured)).toHaveLength(6);
  });
});
