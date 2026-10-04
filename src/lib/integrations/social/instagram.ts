// Instagram / Meta Graph API publishing adapter.

import { env } from "../../env";
import { isComplete, resolveIntegration } from "../../credentials";

export interface PublishResult {
  ok: boolean;
  mode: "live" | "mock";
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

async function graphFetch(path: string, params: Record<string, string>, graphVersion: string): Promise<unknown> {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url.toString(), { method: "POST", signal: controller.signal });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || json.error) throw new Error(json.error?.message ?? `Graph API error ${res.status}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export const instagramAdapter = {
  key: "instagram",

  async isConfigured(): Promise<boolean> {
    return isComplete("instagram", await resolveIntegration("instagram"));
  },

  /**
   * Publishes a Reel/post to an Instagram Business Account.
   * Requires media_url (public video/image URL) per Graph API rules.
   */
  async publish(input: { caption: string; mediaUrl?: string }): Promise<PublishResult> {
    const creds = await resolveIntegration("instagram");
    if (!isComplete("instagram", creds) || !input.mediaUrl) {
      return {
        ok: false,
        mode: "mock",
        error: isComplete("instagram", creds)
          ? "mediaUrl is required for Instagram publishing"
          : "Instagram API не настроен (нужны access token и business account ID в Настройках) - публикация остаётся в режиме mock",
      };
    }
    try {
      const container = (await graphFetch(
        `${creds.accountId}/media`,
        {
          media_type: "REELS",
          video_url: input.mediaUrl,
          caption: input.caption,
          access_token: creds.accessToken,
        },
        env.metaGraphVersion,
      )) as { id: string };
      const published = (await graphFetch(
        `${creds.accountId}/media_publish`,
        { creation_id: container.id, access_token: creds.accessToken },
        env.metaGraphVersion,
      )) as { id: string };
      return { ok: true, mode: "live", externalId: published.id };
    } catch (err) {
      return { ok: false, mode: "live", error: (err as Error).message };
    }
  },
};
