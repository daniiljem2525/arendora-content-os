import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { runWorkflow } from "@/lib/scheduler/queue";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ req }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const items = await prisma.idea.findMany({
    where: status ? { status } : undefined,
    include: { researchItem: { select: { title: true, type: true } }, campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return json({ items });
});

const createSchema = z.object({
  title: z.string().min(5).max(300),
  angle: z.string().min(3).max(1000),
  campaignId: z.string().cuid().optional(),
});

export const POST = handler(async ({ req }) => {
  const data = validate(createSchema, await parseBody(req));
  const idea = await prisma.idea.create({ data: { title: data.title, angle: data.angle, campaignId: data.campaignId } });
  return json({ idea }, { status: 201 });
});

const patchSchema = z.object({
  status: z.enum(["new", "selected", "rejected", "produced"]).optional(),
  campaignId: z.string().cuid().nullable().optional(),
  title: z.string().min(5).max(300).optional(),
  angle: z.string().min(3).max(1000).optional(),
});

export const PATCH = handler(async ({ req }) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) throw new ApiError(400, "id query param required");
  const data = validate(patchSchema, await parseBody(req));
  const idea = await prisma.idea.update({ where: { id }, data });
  return json({ idea });
});
