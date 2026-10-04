import { z } from "zod";
import { handler, json, parseBody, validate } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  return json({ campaigns });
});

const createSchema = z.object({
  name: z.string().min(3).max(200),
  goal: z.enum(["traffic", "registrations", "activation", "revenue"]).optional(),
  notes: z.string().max(2000).optional(),
});

export const POST = handler(async ({ req }) => {
  const data = validate(createSchema, await parseBody(req));
  const campaign = await prisma.campaign.create({ data });
  return json({ campaign }, { status: 201 });
}, { rateLimit: 30 });
