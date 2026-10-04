import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { runContentAgent } from "@/lib/agents/content";
import { runQaAgent } from "@/lib/agents/qa";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ req }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const id = url.searchParams.get("id");
  if (id) {
    const item = await prisma.contentItem.findUnique({
      where: { id },
      include: { variants: true, idea: true, campaign: true },
    });
    if (!item) throw new ApiError(404, "Content item not found");
    return json({ item });
  }
  const items = await prisma.contentItem.findMany({
    where: status ? { status } : undefined,
      include: { idea: { select: { title: true } }, variants: { select: { id: true, kind: true, platform: true, status: true, qaScore: true, version: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return json({ items });
});

const generateSchema = z.object({
  ideaId: z.string().cuid(),
  campaignId: z.string().cuid().optional(),
});

export const POST = handler(async ({ req }) => {
  const data = validate(generateSchema, await parseBody(req));
  const result = await runContentAgent(data.ideaId, { campaignId: data.campaignId });
  return json({ ok: true, ...result }, { status: 201 });
}, { rateLimit: 20 });

const actionSchema = z.object({
  action: z.enum(["qa_review", "archive"]),
  contentItemId: z.string().cuid(),
});

export const PATCH = handler(async ({ req }) => {
  const data = validate(actionSchema, await parseBody(req));
  if (data.action === "archive") {
    const item = await prisma.contentItem.update({ where: { id: data.contentItemId }, data: { status: "archived" } });
    return json({ item });
  }
  const variants = await prisma.contentVariant.findMany({ where: { contentItemId: data.contentItemId } });
  const results = [];
  for (const v of variants) {
    const r = await runQaAgent(v.id);
    results.push(...r.results);
  }
  return json({ ok: true, results });
}, { rateLimit: 20 });
