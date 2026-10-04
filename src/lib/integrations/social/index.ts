// Social publishing facade: maps a platform key to its adapter and creates
// publication records. MOCK publications are NEVER marked "published" -
// they stay in status "mock" so the dashboard shows they were not really
// posted.

import { prisma } from "../../db";
import { instagramAdapter, type PublishResult } from "./instagram";
import { threadsAdapter } from "./threads";
import { xAdapter } from "./x";
import { tiktokAdapter } from "./tiktok";

export type { PublishResult };

interface SocialAdapter {
  key: string;
  isConfigured(): Promise<boolean>;
  publish(input: { caption?: string; text?: string; mediaUrl?: string; videoUrl?: string }): Promise<PublishResult>;
}

const ADAPTERS: Record<string, SocialAdapter> = {
  instagram: instagramAdapter as unknown as SocialAdapter,
  threads: threadsAdapter as unknown as SocialAdapter,
  x: xAdapter as unknown as SocialAdapter,
  tiktok: tiktokAdapter as unknown as SocialAdapter,
};

/** Text extracted from a variant payload for publishing. */
export function extractPostText(platform: string, payload: Record<string, unknown>): { text: string; mediaUrl?: string; videoUrl?: string } {
  switch (platform) {
    case "x":
      return { text: payload.text ? String(payload.text) : Array.isArray(payload.tweets) ? String(payload.tweets[0]) : "" };
    case "threads":
      return { text: String(payload.text ?? "") };
    case "instagram": {
      const reel = payload.caption ? payload : (payload.beatByBeat ? { caption: String(payload.caption ?? "") } : payload);
      return { text: String(reel.caption ?? payload.caption ?? ""), mediaUrl: typeof payload.mediaUrl === "string" ? payload.mediaUrl : undefined };
    }
    case "tiktok":
      return { text: String(payload.captions ?? payload.cta ?? ""), videoUrl: typeof payload.videoUrl === "string" ? payload.videoUrl : undefined };
    default:
      return { text: JSON.stringify(payload).slice(0, 400) };
  }
}

export async function publishVariant(variantId: string): Promise<{ publicationId: string; status: string; mode: string; error?: string }> {
  const variant = await prisma.contentVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error(`Variant not found: ${variantId}`);
  if (variant.platform === "seo") throw new Error("SEO content is not published through social adapters");

  const adapter = ADAPTERS[variant.platform];
  if (!adapter) throw new Error(`No adapter for platform: ${variant.platform}`);

  const payload = JSON.parse(variant.payload) as Record<string, unknown>;
  const { text, mediaUrl, videoUrl } = extractPostText(variant.platform, payload);

  // Reuse an existing failed publication row instead of piling up new ones
  // on every retry; successful/mock publications are never re-attempted by
  // the auto loop (they are filtered out in the workflow).
  const lastFailed = await prisma.publication.findFirst({
    where: { variantId: variant.id, status: "failed" },
    orderBy: { createdAt: "desc" },
  });

  // Retry cap: stop burning API credits after MAX_PUBLISH_ATTEMPTS failures.
  const MAX_PUBLISH_ATTEMPTS = 5;
  if (lastFailed && lastFailed.attempts >= MAX_PUBLISH_ATTEMPTS) {
    return {
      publicationId: lastFailed.id,
      status: "failed",
      mode: lastFailed.mode,
      error: `Превышен лимит попыток (${MAX_PUBLISH_ATTEMPTS}). Последняя ошибка: ${lastFailed.error ?? "unknown"}`,
    };
  }

  const mode = (await adapter.isConfigured()) ? "live" : "mock";
  const pub =
    lastFailed ??
    (await prisma.publication.create({
      data: { variantId: variant.id, platform: variant.platform, mode, status: "pending" },
    }));
  await prisma.publication.update({
    where: { id: pub.id },
    data: { mode, status: "pending", error: null, attempts: { increment: 1 } },
  });

  const result = await adapter.publish({ text, caption: text, mediaUrl, videoUrl });

  if (result.ok) {
    await prisma.publication.update({
      where: { id: pub.id },
      data: {
        status: "published",
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        publishedAt: new Date(),
        error: null,
      },
    });
    await prisma.contentVariant.update({ where: { id: variant.id }, data: { status: "published" } });
    await prisma.contentItem.update({ where: { id: variant.contentItemId }, data: { status: "published" } });
    return { publicationId: pub.id, status: "published", mode: result.mode };
  }

  // Not published: record the real state (mock or failure). Never fake success.
  // The content item stays "approved" so the auto loop keeps retrying;
  // the failure itself is visible on the publication row.
  const status = result.mode === "mock" ? "mock" : "failed";
  await prisma.publication.update({
    where: { id: pub.id },
    data: { status, error: result.error },
  });
  return { publicationId: pub.id, status, mode: result.mode, error: result.error };
}

export { ADAPTERS as socialAdapters };
