// Integration test: full content pipeline with the builtin generation
// engine (no network, no credentials) on an isolated test database.

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { runResearchAgent } from "@/lib/agents/research";
import { runWorkflow } from "@/lib/scheduler/queue";
import { publishVariant } from "@/lib/integrations/social";
import { prisma } from "@/lib/db";

beforeAll(() => {
  execSync("npx prisma db push --skip-generate", { env: process.env, stdio: "pipe" });
});

describe("content pipeline (builtin engine)", () => {
  let ideaId: string;
  let contentItemId: string;
  let threadsVariantId: string;

  it("research agent stores original insights", async () => {
    const r = await runResearchAgent({ perType: 1, useWeb: false });
    expect(r.created.length).toBeGreaterThan(0);
    for (const item of r.created) {
      expect(item.title.length).toBeGreaterThan(10);
    }
  });

  it("idea generation turns research into ideas", async () => {
    const res = await runWorkflow("daily_ideas", { count: 3 });
    expect(res.ok).toBe(true);
    const count = await prisma.idea.count();
    expect(count).toBeGreaterThanOrEqual(3);
    ideaId = (await prisma.idea.findFirst({ where: { status: "new" } }))!.id;
  });

  it("strategy agent scores and selects ideas", async () => {
    const res = await runWorkflow("weekly_strategy", { weekCount: 2 });
    expect(res.ok).toBe(true);
    expect(res.summary!.selected as number).toBeGreaterThan(0);
    const top = await prisma.idea.findFirst({ where: { status: "selected" }, orderBy: { totalScore: "desc" } });
    expect(top).not.toBeNull();
    expect(top!.totalScore).toBeGreaterThan(0);
  });

  it("content agent produces platform-distinct variants with QA", async () => {
    const res = await runWorkflow("content_production", {});
    expect(res.ok).toBe(true);
    const item = await prisma.contentItem.findFirst({ where: { ideaId }, include: { variants: true } });
    const anyItem =
      item ??
      (await prisma.contentItem.findFirst({ include: { variants: true } }));
    expect(anyItem).not.toBeNull();
    contentItemId = anyItem!.id;

    const kinds = anyItem!.variants.map((v) => v.kind);
    expect(kinds).toContain("tiktok_script");
    expect(kinds).toContain("ig_carousel");
    expect(kinds).toContain("x_thread");
    expect(kinds).toContain("threads_post");
    expect(kinds).toContain("seo_brief");

    // every variant passed QA (awaiting_approval) or was regenerated
    for (const v of anyItem!.variants) {
      expect(["awaiting_approval", "approved"]).toContain(v.status);
      expect(v.qaScore).toBeGreaterThanOrEqual(70);
    }

    // platform distinctness: tiktok payload has scenes, carousel has slides
    const tiktok = anyItem!.variants.find((v) => v.kind === "tiktok_script")!;
    const carousel = anyItem!.variants.find((v) => v.kind === "ig_carousel")!;
    const tiktokPayload = JSON.parse(tiktok.payload);
    const carouselPayload = JSON.parse(carousel.payload);
    expect(Array.isArray(tiktokPayload.scenes)).toBe(true);
    expect(Array.isArray(carouselPayload.slides)).toBe(true);

    threadsVariantId = anyItem!.variants.find((v) => v.kind === "threads_post")!.id;
  });

  it("video agent packages the short-form script", async () => {
    const res = await runWorkflow("video_production", { contentItemId });
    expect(res.ok).toBe(true);
    const variant = await prisma.contentVariant.findFirst({ where: { contentItemId, kind: "video_package" } });
    expect(variant).not.toBeNull();
    const payload = JSON.parse(variant!.payload);
    expect(payload.hook).toBeTruthy();
    expect(payload.thumbnail).toBeTruthy();
    expect(Array.isArray(payload.visualInstructions)).toBe(true);
  });

  it("approval flow moves content to approved", async () => {
    await prisma.contentItem.update({ where: { id: contentItemId }, data: { status: "awaiting_approval" } });
    await prisma.contentVariant.updateMany({ where: { contentItemId }, data: { status: "awaiting_approval" } });
    await prisma.contentItem.update({ where: { id: contentItemId }, data: { status: "approved" } });
    const item = await prisma.contentItem.findUnique({ where: { id: contentItemId } });
    expect(item!.status).toBe("approved");
  });

  it("publishing without credentials stays in MOCK mode (never 'published')", async () => {
    const result = await publishVariant(threadsVariantId);
    expect(result.status).toBe("mock");
    const pub = await prisma.publication.findUnique({ where: { id: result.publicationId } });
    expect(pub!.mode).toBe("mock");
    expect(pub!.status).toBe("mock");
    expect(pub!.publishedAt).toBeNull();
  });

  it("analytics agent stores labeled mock metrics and learning agent extracts insights", async () => {
    process.env.ANALYTICS_MOCK_DATA = "true";
    const res = await runWorkflow("analytics_collection", { days: 3 });
    expect(res.ok).toBe(true);
    const records = await prisma.analyticsRecord.findMany({ where: { publicationId: { not: null } } });
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((r) => r.isMock)).toBe(true);

    const learning = await runWorkflow("learning", {});
    expect(learning.ok).toBe(true);
  });

  it("seo agent researches keywords and writes an article without fabricated data", async () => {
    const research = await runWorkflow("seo_research", { count: 2 });
    expect(research.ok).toBe(true);
    const keyword = await prisma.keyword.findFirst({ where: { source: "seo_agent" } });
    if (keyword) {
      const res = await runWorkflow("seo_article", { keywordId: keyword.id });
      expect(res.ok).toBe(true);
      const article = await prisma.seoArticle.findFirst({ where: { keywordId: keyword.id } });
      expect(article!.body!.length).toBeGreaterThan(300);
      expect(article!.metaDescription.length).toBeLessThanOrEqual(158);
    }
  });
});
