import { handler, json } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const insights = await prisma.learningInsight.findMany({
    orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  return json({ insights: insights.map((i) => ({ ...i, evidence: JSON.parse(i.evidence) })) });
});
