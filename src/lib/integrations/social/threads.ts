// Threads API publishing adapter.

import { isComplete, resolveIntegration } from "../../credentials";
import type { PublishResult } from "./instagram";

export const threadsAdapter = {
  key: "threads",

  async isConfigured(): Promise<boolean> {
    return isComplete("threads", await resolveIntegration("threads"));
  },

  async publish(input: { text: string }): Promise<PublishResult> {
    const creds = await resolveIntegration("threads");
    if (!isComplete("threads", creds)) {
      return {
        ok: false,
        mode: "mock",
        error: "Threads API не настроен (нужны access token и user ID в Настройках) - публикация остаётся в режиме mock",
      };
    }
    const base = "https://graph.threads.net/v1.0";
    try {
      const container = await fetch(
        `${base}/${creds.userId}/threads?media_type=TEXT&text=${encodeURIComponent(input.text)}&access_token=${creds.accessToken}`,
        { method: "POST" },
      ).then((r) => r.json() as Promise<{ id?: string; error?: { message: string } }>);
      if (container.error) throw new Error(container.error.message);
      const published = await fetch(
        `${base}/${creds.userId}/threads_publish?creation_id=${container.id}&access_token=${creds.accessToken}`,
        { method: "POST" },
      ).then((r) => r.json() as Promise<{ id?: string; error?: { message: string } }>);
      if (published.error) throw new Error(published.error.message);
      return { ok: true, mode: "live", externalId: published.id };
    } catch (err) {
      return { ok: false, mode: "live", error: (err as Error).message };
    }
  },
};
