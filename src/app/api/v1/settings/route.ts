import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { integrationsStatus } from "@/lib/integrations";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const [rules, knowledge, jobs, integrations, autoPublish] = await Promise.all([
    prisma.brandRule.findMany({ orderBy: { key: "asc" } }),
    prisma.productKnowledge.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.jobDefinition.findMany({ orderBy: { key: "asc" } }),
    integrationsStatus(),
    getAppSetting("auto_publish"),
  ]);
  return json({ rules, knowledge, jobs, integrations, autoPublish: autoPublish === "true" });
});

const ruleSchema = z.object({ key: z.string().min(2).max(50), value: z.string().min(2).max(8000) });

export const PUT = handler(async ({ req }) => {
  const data = validate(ruleSchema, await parseBody(req));
  const existing = await prisma.brandRule.findUnique({ where: { key: data.key } });
  if (!existing) throw new ApiError(404, "Brand rule not found");
  const rule = await prisma.brandRule.update({ where: { key: data.key }, data: { value: data.value } });
  return json({ rule });
});

const jobSchema = z.object({ key: z.string().min(2).max(50), enabled: z.boolean().optional(), cron: z.string().max(50).optional() });

export const PATCH = handler(async ({ req }) => {
  const data = validate(jobSchema, await parseBody(req));
  if (data.cron !== undefined) {
    // basic cron validation via node-cron
    const cron = await import("node-cron");
    if (!cron.validate(data.cron)) throw new ApiError(400, "Invalid cron expression");
  }
  const job = await prisma.jobDefinition.update({
    where: { key: data.key },
    data: { ...(data.enabled !== undefined && { enabled: data.enabled }), ...(data.cron && { cron: data.cron }) },
  });
  return json({ job });
});
