// Content Agent: for a selected idea, generates platform-specific variants.
// Each platform gets a structurally and stylistically distinct piece:
// TikTok script, Instagram Reel script, Instagram carousel, X post/thread,
// Threads post, SEO article brief.

import { prisma, createAgentContext, createLogger, agentGenerate, payloadToText, type AgentContext } from "./base";
import { brandGuard } from "../brand";
import { reviewVariant } from "./qa";
import type { PlatformKey, VariantKind } from "../status";

export const IDEA_VARIANT_PLAN: { platform: PlatformKey; kind: VariantKind }[] = [
  { platform: "tiktok", kind: "tiktok_script" },
  { platform: "instagram", kind: "ig_reel" },
  { platform: "instagram", kind: "ig_carousel" },
  { platform: "x", kind: "x_thread" },
  { platform: "threads", kind: "threads_post" },
  { platform: "seo", kind: "seo_brief" },
];

const KIND_INSTRUCTIONS: Record<string, string> = {
  tiktok_script:
    "TikTok script: punchy spoken hook, scene-by-scene beats with timecodes, screen-recording visual directions (no AI avatars), on-screen text, captions, CTA.",
  ig_reel:
    "Instagram Reel: lifestyle-professional tone, beat-by-beat direction, caption with 4-6 hashtags, softer CTA.",
  ig_carousel:
    "Instagram carousel: 6-8 slides, each with headline (max 6 words), body (max 30 words) and visual direction; save-worthy.",
  x_thread:
    "X thread: 3-4 tweets, each under 280 characters, terse insight-driven style, no hashtag spam.",
  threads_post:
    "Threads post: conversational storytelling under 500 characters, ends with a question or CTA.",
  seo_brief:
    "SEO article brief: keyword, search intent, cluster, title (<=60 chars), meta description (<=155 chars), H1, outline with H2 sections and bullet points, FAQ suggestions, internal link suggestions, CTA.",
};

export interface GenerateContentResult {
  contentItemId: string;
  variants: {
    id: string;
    platform: string;
    kind: string;
    status: string;
    qaScore: number | null;
    version: number;
    regenerated: boolean;
  }[];
  logs: string[];
}

export async function runContentAgent(ideaId: string, options: { campaignId?: string } = {}) {
  const logger = createLogger();
  const ctx = await createAgentContext(logger);
  logger.log(`Content Agent: producing content for idea ${ideaId}`);

  const idea = await prisma.idea.findUnique({ where: { id: ideaId }, include: { researchItem: true } });
  if (!idea) throw new Error(`Idea not found: ${ideaId}`);

  const insights = await prisma.learningInsight.findMany({
    orderBy: { confidence: "desc" },
    take: 3,
  });

  const contentItem = await prisma.contentItem.create({
    data: {
      ideaId: idea.id,
      campaignId: options.campaignId ?? idea.campaignId,
      title: idea.title,
      primaryPlatform: "tiktok",
      status: "ai_review",
    },
  });
  logger.log(`content item created: ${contentItem.id}`);

  const results: GenerateContentResult["variants"] = [];

  for (const plan of IDEA_VARIANT_PLAN) {
    const variant = await generateVariant(ctx, contentItem.id, idea.title, idea.angle ?? "", plan.platform, plan.kind, insights.map((i) => i.finding), 1);
    results.push({ ...variant, regenerated: false });
  }

  await prisma.idea.update({ where: { id: idea.id }, data: { status: "produced" } });

  return { contentItemId: contentItem.id, variants: results, logs: logger.lines() };
}

/** Generate one variant, run QA, and regenerate once if QA rejects it. */
export async function generateVariant(
  ctx: AgentContext,
  contentItemId: string,
  ideaTitle: string,
  angle: string,
  platform: PlatformKey,
  kind: VariantKind,
  insights: string[],
  version: number,
): Promise<{ id: string; platform: string; kind: string; status: string; qaScore: number | null; version: number }> {
  const { data } = await agentGenerate<Record<string, unknown>>(
    ctx,
    kind === "seo_brief" ? "seo_article" : "content_variant",
    { kind, ideaTitle, angle, insights, seed: `${contentItemId}:${kind}:v${version}` },
    `You are the Content Agent for Arendora (property management SaaS). Produce a ${KIND_INSTRUCTIONS[kind] ?? kind} ` +
      `in Russian. Style must be specific to ${platform}: do NOT reuse copy from other platforms. ` +
      `Prioritize product screen recordings, UI demonstrations, data and visual explanations. ` +
      `Use only facts from the brand knowledge; if a number is unknown, do not invent it.`,
    `Idea: "${ideaTitle}". Angle: ${angle || "direct"}.` +
      (insights.length ? `\nPerformance insights to apply: ${insights.join("; ")}` : ""),
  );

  const text = payloadToText(data);
  const guard = brandGuard(text);

  const variant = await prisma.contentVariant.create({
    data: {
      contentItemId,
      platform,
      kind,
      payload: JSON.stringify(data),
      status: guard.ok ? "ai_review" : "draft",
      qaScore: null,
      version,
    },
  });

  const review = await reviewVariant(variant.id);

  // QA rejects weak content: one regeneration attempt, then accept the result.
  if (review.status === "rejected" && version < 2) {
    const retry = await regenerateVariant(variant.id);
    return retry;
  }

  return {
    id: variant.id,
    platform,
    kind,
    status: review.status,
    qaScore: review.score,
    version,
  };
}

/** Regenerate a rejected variant once, then leave the better version in place. */
export async function regenerateVariant(variantId: string) {
  const logger = createLogger();
  const ctx = await createAgentContext(logger);
  const variant = await prisma.contentVariant.findUnique({
    where: { id: variantId },
    include: { contentItem: { include: { idea: true } } },
  });
  if (!variant) throw new Error(`Variant not found: ${variantId}`);

  const insights = await prisma.learningInsight.findMany({ orderBy: { confidence: "desc" }, take: 3 });
  logger.log(`regenerating variant ${variantId} (v${variant.version}) after QA rejection`);
  return generateVariant(
    ctx,
    variant.contentItemId,
    variant.contentItem.idea.title,
    variant.contentItem.idea.angle ?? "",
    variant.platform as PlatformKey,
    variant.kind as VariantKind,
    insights.map((i) => i.finding),
    variant.version + 1,
  );
}
