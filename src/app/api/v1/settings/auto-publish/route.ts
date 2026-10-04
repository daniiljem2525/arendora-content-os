// Auto-publish toggle: when enabled, the in-app loop (src/instrumentation.ts)
// publishes approved content whose scheduled time has arrived every minute.

import { z } from "zod";
import { handler, json, parseBody, validate } from "@/lib/api";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  return json({ enabled: (await getAppSetting("auto_publish")) === "true" });
});

const schema = z.object({ enabled: z.boolean() });

export const PUT = handler(async ({ req }) => {
  const { enabled } = validate(schema, await parseBody(req));
  await setAppSetting("auto_publish", enabled ? "true" : "false");
  return json({ ok: true, enabled });
}, { rateLimit: 30 });
