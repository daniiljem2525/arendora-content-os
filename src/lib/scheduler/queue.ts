// DB-backed job queue: every workflow execution is recorded as a JobRun
// with logs, status and errors. Failures trigger a Telegram notification
// (mock no-op if unconfigured).

import { prisma } from "../db";
import { getWorkflow, WORKFLOW_NAMES } from "../agents/registry";
import { sendTelegramMessage } from "../integrations/telegram";

export interface JobRunResult {
  jobRunId: string;
  ok: boolean;
  summary?: Record<string, unknown>;
  error?: string;
  logs: string[];
}

export async function runWorkflow(
  workflow: string,
  payload: Record<string, unknown> = {},
  trigger: "manual" | "schedule" = "manual",
): Promise<JobRunResult> {
  const fn = getWorkflow(workflow);
  if (!fn) {
    throw new Error(`Unknown workflow: ${workflow}. Available: ${WORKFLOW_NAMES.join(", ")}`);
  }

  const jobRun = await prisma.jobRun.create({
    data: { workflow, trigger, status: "running" },
  });

  try {
    const result = await fn(payload);
    const ok = result.ok !== false;
    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: ok ? "success" : "failed",
        logs: result.logs.join("\n"),
        error: ok ? null : JSON.stringify(result.summary ?? {}),
        finishedAt: new Date(),
      },
    });
    return { jobRunId: jobRun.id, ok, summary: result.summary, logs: result.logs };
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: { status: "failed", logs: message, error: message, finishedAt: new Date() },
    });
    await sendTelegramMessage(`Arendora Content OS: workflow "${workflow}" failed: ${message}`);
    return { jobRunId: jobRun.id, ok: false, error: message, logs: [message] };
  }
}

export async function ensureDefaultJobs() {
  const defaults = [
    { key: "daily_research", name: "Daily research", cron: "0 8 * * *", workflow: "daily_research" },
    { key: "daily_ideas", name: "Daily idea generation", cron: "0 9 * * *", workflow: "daily_ideas" },
    { key: "weekly_strategy", name: "Weekly content strategy", cron: "0 7 * * 1", workflow: "weekly_strategy" },
    { key: "content_production", name: "Content production", cron: "30 9 * * 1", workflow: "content_production" },
    { key: "seo_research", name: "SEO keyword research", cron: "0 10 * * 2", workflow: "seo_research" },
    { key: "publish_scheduled", name: "Publish scheduled content", cron: "*/30 * * * *", workflow: "publish_scheduled" },
    { key: "analytics_collection", name: "Analytics collection", cron: "0 23 * * *", workflow: "analytics_collection" },
    { key: "learning", name: "Learning cycle", cron: "0 6 * * 6", workflow: "learning" },
    { key: "weekly_report", name: "Weekly performance report", cron: "0 18 * * 1", workflow: "weekly_report" },
  ];
  for (const d of defaults) {
    await prisma.jobDefinition.upsert({ where: { key: d.key }, create: d, update: {} });
  }
}
