import { z } from "zod";
import { handler, json, parseBody, validate } from "@/lib/api";
import { analyticsSummary } from "@/lib/agents/analytics";
import { runWorkflow } from "@/lib/scheduler/queue";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ req }) => {
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
  const summary = await analyticsSummary(days);
  return json({ summary });
});

const collectSchema = z.object({ days: z.number().int().min(1).max(30).optional() });

export const POST = handler(async ({ req }) => {
  const body = (await parseBody(req)) ?? {};
  const { days } = validate(collectSchema, body);
  const result = await runWorkflow("analytics_collection", { days });
  return json(result, { status: result.ok ? 201 : 500 });
}, { rateLimit: 10 });
