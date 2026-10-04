// In-app auto-publish loop. Started lazily from server-side entry points
// (dashboard layout, health/agents routes). Every 60s, when the auto_publish
// setting is enabled, approved content whose scheduled time has arrived is
// published via the publish_scheduled workflow.

import { isAutoPublishEnabled } from "../app-settings";
import { runWorkflow } from "./queue";

const g = globalThis as unknown as { __arendoraAutoPublishStarted?: boolean };

export function ensureAutoPublishLoop() {
  if (g.__arendoraAutoPublishStarted) return;
  g.__arendoraAutoPublishStarted = true;

  const tick = async () => {
    try {
      if (!(await isAutoPublishEnabled())) return;
      const result = await runWorkflow("publish_scheduled", {}, "schedule");
      if (result.ok && typeof result.summary?.processed === "number" && result.summary.processed > 0) {
        console.log(`[auto-publish] published ${result.summary.processed} variants`);
      }
    } catch (err) {
      console.error("[auto-publish] tick failed:", err);
    }
  };

  setInterval(tick, 60_000);
  void tick;
  console.log("[auto-publish] loop registered (runs every 60s when enabled in Settings)");
}
