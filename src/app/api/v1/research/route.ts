import { z } from "zod";
import { handler, json, parseBody, validate } from "@/lib/api";
import { prisma } from "@/lib/db";
import { runResearchAgent } from "@/lib/agents/research";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ req }) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const items = await prisma.researchItem.findMany({
    where: { ...(type && { type }), ...(status && { status }) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json({ items });
});

const runSchema = z.object({
  perType: z.number().int().min(1).max(10).optional(),
  useWeb: z.boolean().optional(),
  topic: z.string().max(300).optional(),
});

export const POST = handler(async ({ req }) => {
  const body = (await parseBody(req)) ?? {};
  const opts = validate(runSchema, body);
  const result = await runResearchAgent(opts);
  return json({ ok: true, created: result.created }, { status: 201 });
}, { rateLimit: 10 });
