import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Content calendar: scheduled publications and approved content by date.
export const GET = handler(async ({ req }) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : new Date(Date.now() - 7 * 86_400_000);
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date(Date.now() + 30 * 86_400_000);

  const items = await prisma.contentItem.findMany({
    where: { scheduledAt: { gte: from, lte: to }, status: { in: ["approved", "awaiting_approval", "draft", "ai_review", "published"] } },
    include: { variants: { select: { id: true, platform: true, kind: true, status: true } }, campaign: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  const unscheduled = await prisma.contentItem.findMany({
    where: { scheduledAt: null, status: { in: ["approved", "awaiting_approval"] } },
    include: { variants: { select: { id: true, platform: true, kind: true, status: true } } },
    take: 50,
  });

  return json({ events: items, unscheduled });
});

const scheduleSchema = z.object({
  contentItemId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
  platform: z.enum(["tiktok", "instagram", "x", "threads", "seo"]).optional(),
  campaignId: z.string().cuid().nullable().optional(),
});

export const POST = handler(async ({ req }) => {
  const data = validate(scheduleSchema, await parseBody(req));
  const item = await prisma.contentItem.update({
    where: { id: data.contentItemId },
    data: {
      scheduledAt: new Date(data.scheduledAt),
      ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
      ...(data.platform && { primaryPlatform: data.platform }),
    },
  });
  return json({ ok: true, item });
}, { rateLimit: 60 });

const cancelSchema = z.object({ contentItemId: z.string().cuid() });

export const DELETE = handler(async ({ req }) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("contentItemId");
  if (!id) throw new ApiError(400, "contentItemId required");
  await validate(cancelSchema, { contentItemId: id });
  const item = await prisma.contentItem.update({ where: { id }, data: { scheduledAt: null } });
  return json({ ok: true, item });
});
