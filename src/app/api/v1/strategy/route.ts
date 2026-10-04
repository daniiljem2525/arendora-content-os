import { handler, json } from "@/lib/api";
import { prisma } from "@/lib/db";
import { runStrategyAgent } from "@/lib/agents/strategy";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const plans = await prisma.strategyPlan.findMany({ orderBy: { createdAt: "desc" }, take: 12 });
  return json({ plans });
});

export const POST = handler(async ({ req }) => {
  const url = new URL(req.url);
  const weekCount = Number(url.searchParams.get("weekCount") ?? 5) || 5;
  const result = await runStrategyAgent({ weekCount: Math.min(20, Math.max(1, weekCount)) });
  return json({ ok: true, planId: result.planId, selected: result.selected }, { status: 201 });
}, { rateLimit: 10 });
