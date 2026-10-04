// Cron scheduler process. Run with: npm run scheduler
// Loads JobDefinitions from the DB and executes workflows on schedule.
// Safe to run alongside the Next.js app; each execution is a queued JobRun.

import "dotenv/config";
import cron from "node-cron";
import { ensureDefaultJobs, runWorkflow } from "../lib/scheduler/queue";
import { prisma } from "../lib/db";

async function main() {
  await ensureDefaultJobs();
  const jobs = await prisma.jobDefinition.findMany({ where: { enabled: true } });

  for (const job of jobs) {
    if (!cron.validate(job.cron)) {
      console.error(`[scheduler] invalid cron for ${job.key}: ${job.cron}`);
      continue;
    }
    cron.schedule(job.cron, async () => {
      console.log(`[scheduler] firing ${job.key} (${job.workflow})`);
      const result = await runWorkflow(job.workflow, {}, "schedule");
      console.log(`[scheduler] ${job.key} finished: ok=${result.ok}${result.error ? ` error=${result.error}` : ""}`);
    });
    console.log(`[scheduler] registered ${job.key}: "${job.cron}" -> ${job.workflow}`);
  }

  console.log(`[scheduler] running with ${jobs.length} jobs. Press Ctrl+C to stop.`);
}

main()
  .catch((err) => {
    console.error("[scheduler] fatal:", err);
    process.exit(1);
  })
  .finally(() => {
    // keep process alive; prisma client stays connected
    void prisma.$connect();
  });
