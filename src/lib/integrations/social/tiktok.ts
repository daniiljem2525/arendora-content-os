// TikTok Content Posting API adapter (video upload requires a hosted
// video_url per API rules; direct file upload uses the chunked endpoint
// which is out of scope for this adapter's first version).

import { isComplete, resolveIntegration } from "../../credentials";
import type { PublishResult } from "./instagram";

export const tiktokAdapter = {
  key: "tiktok",

  async isConfigured(): Promise<boolean> {
    return isComplete("tiktok", await resolveIntegration("tiktok"));
  },

  async publish(input: { caption: string; videoUrl?: string }): Promise<PublishResult> {
    const creds = await resolveIntegration("tiktok");
    if (!isComplete("tiktok", creds)) {
      return {
        ok: false,
        mode: "mock",
        error: "TikTok API не настроен (нужен access token в Настройках) - публикация остаётся в режиме mock",
      };
    }
    if (!input.videoUrl) {
      return { ok: false, mode: "live", error: "TikTok publishing requires videoUrl" };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: { title: input.caption.slice(0, 2200), privacy_level: "SELF_ONLY" },
          source_info: { source: "PULL_FROM_URL", video_url: input.videoUrl },
        }),
        signal: controller.signal,
      });
      const json = (await res.json()) as { data?: { publish_id?: string }; error?: { message: string } };
      if (!res.ok || json.error?.message) throw new Error(json.error?.message ?? `TikTok API error ${res.status}`);
      return { ok: true, mode: "live", externalId: json.data?.publish_id };
    } catch (err) {
      return { ok: false, mode: "live", error: (err as Error).message };
    } finally {
      clearTimeout(timer);
    }
  },
};
