import { json, handler } from "@/lib/api";
import { prisma } from "@/lib/db";
import { currentLlmMode } from "@/lib/agents/base";
import { ensureAutoPublishLoop } from "@/lib/scheduler/auto-publish";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  ensureAutoPublishLoop();
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }
  return json({ status: "ok", db, llm: await currentLlmMode(), time: new Date().toISOString() });
}, { auth: "public", rateLimit: 60 });
