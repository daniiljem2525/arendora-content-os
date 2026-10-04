import { describe, it, expect } from "vitest";
import { runQaChecks, similarity } from "@/lib/agents/qa";
import { brandGuard } from "@/lib/brand";
import { extractJson } from "@/lib/llm/json";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { scoreIdeaText } from "@/lib/agents/strategy";
import { runMockGenerator } from "@/lib/llm/mock-generators";

describe("brand guard", () => {
  it("flags fabricated percentage growth claims", () => {
    const res = brandGuard("Arendora increases revenue by 40% instantly");
    expect(res.ok).toBe(false);
    expect(res.violations.length).toBeGreaterThan(0);
  });

  it("flags guarantee language", () => {
    expect(brandGuard("гарантия результата для каждого").ok).toBe(false);
  });

  it("flags invented customer counts", () => {
    expect(brandGuard("нам доверяют более 50000 арендодателей").ok).toBe(false);
  });

  it("passes safe copy", () => {
    expect(brandGuard("Платежи по объектам видны в одном месте. Arendora - arendora.ru").ok).toBe(true);
  });
});

describe("QA checks", () => {
  const goodThread = {
    tweets: [
      "У собственников 3-30 объектов учёт обычно живёт в Excel и Telegram.",
      "Что теряется первым: история платежей и договорённости.",
    ],
    cta: "arendora.ru",
  };

  it("passes a compliant thread", () => {
    const report = runQaChecks(goodThread, "x_thread", []);
    expect(report.status).toBe("awaiting_approval");
    expect(report.score).toBeGreaterThanOrEqual(70);
  });

  it("rejects X post over 280 chars", () => {
    const report = runQaChecks({ text: "а".repeat(300), cta: "arendora.ru" }, "x_post", []);
    const compliance = report.checks.find((c) => c.check === "platform_compliance");
    expect(compliance?.passed).toBe(false);
  });

  it("rejects duplicate content", () => {
    const report = runQaChecks(goodThread, "x_thread", [JSON.stringify(goodThread)]);
    const originality = report.checks.find((c) => c.check === "originality");
    expect(originality?.passed).toBe(false);
    expect(report.status).toBe("rejected");
  });

  it("rejects content without CTA", () => {
    const report = runQaChecks({ tweets: ["Какой-то осмысленный твит про учёт аренды без контактов."] }, "x_thread", []);
    const cta = report.checks.find((c) => c.check === "cta_quality");
    expect(cta?.passed).toBe(false);
  });

  it("similarity detects near-identical texts", () => {
    expect(similarity("учёт аренды в одном месте", "учёт аренды в одном месте!")).toBeGreaterThan(0.8);
    expect(similarity("полностью другой текст", "платежи арендаторов")).toBeLessThan(0.4);
  });
});

describe("json extraction", () => {
  it("parses direct JSON", () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}');
  });
  it("parses fenced JSON", () => {
    expect(extractJson('```json\n{"a": [1,2]}\n```')).toBe('{"a": [1,2]}');
  });
  it("parses JSON inside prose with braces in strings", () => {
    const out = extractJson('prefix {"text":"has } brace","b":2} suffix');
    expect(JSON.parse(out)).toEqual({ text: "has } brace", b: 2 });
  });
  it("throws when no JSON", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("rate limiter", () => {
  it("blocks after limit and reports retry-after", () => {
    resetRateLimits();
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit({ key, limit: 3 }).ok).toBe(true);
    }
    const blocked = rateLimit({ key, limit: 3 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("strategy scoring", () => {
  it("scores conversion-focused ideas higher than generic ones", () => {
    const conv = scoreIdeaText("Как остановить просрочки платежей арендаторов", "система учёта платежей");
    const generic = scoreIdeaText("Мысли о недвижимости", "размышление");
    expect(conv.conversion).toBeGreaterThan(generic.conversion);
    expect(conv.totalScore).toBeGreaterThan(0);
  });
});

describe("builtin generator", () => {
  it("produces platform-distinct variants for the same idea", () => {
    const tiktok = runMockGenerator("content_variant", { kind: "tiktok_script", ideaTitle: "Учёт аренды" }) as { scenes: unknown[] };
    const carousel = runMockGenerator("content_variant", { kind: "ig_carousel", ideaTitle: "Учёт аренды" }) as { slides: unknown[] };
    const threads = runMockGenerator("content_variant", { kind: "threads_post", ideaTitle: "Учёт аренды" }) as { text: string };
    expect(tiktok.scenes?.length).toBeGreaterThan(0);
    expect(carousel.slides?.length).toBeGreaterThanOrEqual(6);
    expect(threads.text.length).toBeLessThanOrEqual(500);
  });

  it("does not fabricate metrics in SEO copy", () => {
    const article = runMockGenerator("seo_article", { keyword: "учёт аренды" }) as { body: string; cta: string };
    expect(article.body).toContain("учёт аренды");
    expect(brandGuard(article.body).ok).toBe(true);
    expect(article.cta).toContain("arendora.ru");
  });

  it("varies output with seed (regeneration produces new copy)", () => {
    const a = runMockGenerator("content_variant", { kind: "threads_post", ideaTitle: "X", seed: "v1" }) as { text: string };
    const b = runMockGenerator("content_variant", { kind: "threads_post", ideaTitle: "X", seed: "v2" }) as { text: string };
    expect(a.text).not.toBe(b.text);
  });
});
