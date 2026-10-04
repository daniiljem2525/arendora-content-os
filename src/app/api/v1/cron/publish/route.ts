// Secure cron endpoint for hosting platforms without long-running
// processes (Vercel, Railway free tier, etc.). An external scheduler
// (cron-job.org, Vercel Cron, Supabase pg_cron + edge function) calls this
// once per minute with the CRON_SECRET to trigger auto-publishing.

import { handler, json } from "@/lib/api";
import { runWorkflow } from "@/lib/scheduler/queue";
import { isAutoPublishEnabled } from "@/lib/app-settings";
import { ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

async function run({ req }: { req: Request }) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) throw new ApiError(503, "CRON_SECRET is not configured");
  const auth = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  const provided = auth.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret") || "";
  if (provided !== secret) throw new ApiError(401, "Invalid cron secret");

  const enabled = await isAutoPublishEnabled();
  if (!enabled) return json({ ok: true, skipped: "auto_publish is disabled" });

  const result = await runWorkflow("publish_scheduled", {}, "schedule");
  return json({ ok: true, summary: result.summary });
}

export const GET = handler(run, { auth: "public", rateLimit: 30, rateLimitKey: "cron" });
export const POST = GET;
