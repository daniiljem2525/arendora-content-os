import { z } from "zod";
import { handler, json, parseBody, validate } from "@/lib/api";
import { prisma } from "@/lib/db";
import { runSeoResearch, runSeoArticle } from "@/lib/agents/seo";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ req }) => {
  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") ?? "keywords";
  if (resource === "articles") {
    const articles = await prisma.seoArticle.findMany({
      include: { keyword: { select: { phrase: true, intent: true, cluster: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return json({ articles });
  }
  const keywords = await prisma.keyword.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return json({ keywords });
});

const researchSchema = z.object({ count: z.number().int().min(1).max(20).optional() });

export const POST = handler(async ({ req }) => {
  const body = (await parseBody(req)) ?? {};
  const { resource, ...data } = body as { resource?: string; count?: number; keywordId?: string };

  if (resource === "article" || data.keywordId) {
    const parsed = validate(z.object({ keywordId: z.string().cuid() }), body);
    const result = await runSeoArticle(parsed.keywordId);
    return json({ ok: true, ...result }, { status: 201 });
  }
  const parsed = validate(researchSchema, body);
  const result = await runSeoResearch(parsed.count);
  return json({ ok: true, ...result }, { status: 201 });
}, { rateLimit: 10 });
