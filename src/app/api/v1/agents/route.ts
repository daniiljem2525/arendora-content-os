import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { runWorkflow } from "@/lib/scheduler/queue";
import { WORKFLOW_NAMES } from "@/lib/agents/registry";
import { currentLlmMode } from "@/lib/agents/base";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const jobDefs = await prisma.jobDefinition.findMany({ orderBy: { key: "asc" } });
  const runs = await prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 30 });
  const counts = {
    ideas: await prisma.idea.count(),
    research: await prisma.researchItem.count(),
    contentItems: await prisma.contentItem.count(),
    variants: await prisma.contentVariant.count(),
    insights: await prisma.learningInsight.count(),
  };
  return json({
    llmMode: await currentLlmMode(),
    workflows: WORKFLOW_NAMES,
    jobDefinitions: jobDefs,
    recentRuns: runs,
    counts,
  });
}, { rateLimit: 60 });

const runSchema = z.object({
  workflow: z.string().min(2).max(50),
  payload: z.record(z.unknown()).optional(),
});

export const POST = handler(async ({ req }) => {
  const data = validate(runSchema, await parseBody(req));
  if (!(WORKFLOW_NAMES as string[]).includes(data.workflow)) {
    throw new ApiError(400, `Unknown workflow. Available: ${WORKFLOW_NAMES.join(", ")}`);
  }
  const result = await runWorkflow(data.workflow, data.payload ?? {}, "manual");
  return json(result, { status: result.ok ? 200 : 500 });
}, { rateLimit: 20 });
