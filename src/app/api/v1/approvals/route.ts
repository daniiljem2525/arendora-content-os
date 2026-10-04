import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Approval queue: content items and variants awaiting human review.
export const GET = handler(async () => {
  const items = await prisma.contentItem.findMany({
    where: { status: "awaiting_approval" },
    include: {
      idea: { select: { title: true, angle: true } },
      variants: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  const seoArticles = await prisma.seoArticle.findMany({ where: { status: "ai_review" }, take: 50 });
  return json({ items, seoArticles });
});

const decisionSchema = z.object({
  contentItemId: z.string().cuid().optional(),
  variantId: z.string().cuid().optional(),
  decision: z.enum(["approve", "reject", "archive"]),
  note: z.string().max(1000).optional(),
});

export const POST = handler(async ({ req }) => {
  const data = validate(decisionSchema, await parseBody(req));
  if (!data.contentItemId && !data.variantId) throw new ApiError(400, "contentItemId or variantId required");

  if (data.variantId) {
    const status = data.decision === "approve" ? "approved" : data.decision === "reject" ? "draft" : "archived";
    const variant = await prisma.contentVariant.update({ where: { id: data.variantId }, data: { status } });
    return json({ ok: true, variant });
  }

  const status = data.decision === "approve" ? "approved" : data.decision === "reject" ? "draft" : "archived";
  const item = await prisma.contentItem.update({ where: { id: data.contentItemId! }, data: { status } });
  if (data.decision !== "reject") {
    await prisma.contentVariant.updateMany({ where: { contentItemId: item.id, status: "awaiting_approval" }, data: { status } });
  }
  return json({ ok: true, item });
}, { rateLimit: 60 });
