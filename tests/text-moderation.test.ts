import { describe, expect, it } from "vitest";
import { containsProfanity } from "@/lib/moderation";
import { safeNextPath } from "@/lib/safe-redirect";
import { charCount, cleanText } from "@/lib/text";

describe("cleanText", () => {
  it("trims, normalises line breaks and collapses blank lines", () => {
    expect(cleanText("  hello\r\n\r\n\r\n\r\nworld  ")).toBe("hello\n\nworld");
  });

  it("strips invisible and bidi-override characters", () => {
    expect(cleanText("a​b‮c\u0007d")).toBe("abcd");
  });

  it("leaves HTML as literal text (it is never rendered as HTML)", () => {
    expect(cleanText("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
  });
});

describe("charCount", () => {
  it("counts Chinese characters and emoji as one each, like Postgres", () => {
    expect(charCount("誰應該統治")).toBe(5);
    expect(charCount("👍🏽")).toBe(2); // base + skin-tone modifier = 2 code points
  });
});

describe("containsProfanity", () => {
  it("catches English and Cantonese profanity", () => {
    expect(containsProfanity("what the FUCK")).toBe(true);
    expect(containsProfanity("你個仆街")).toBe(true);
  });

  it("does not flag innocent words containing the same letters", () => {
    expect(containsProfanity("Scunthorpe and shiitake mushrooms")).toBe(false);
    expect(containsProfanity("柏拉圖認為哲學家應該統治")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/en/q/who-should-rule")).toBe("/en/q/who-should-rule");
  });

  it("rejects open redirects", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", null, 42]) {
      expect(safeNextPath(bad)).toBe("/zh-HK");
    }
  });
});
