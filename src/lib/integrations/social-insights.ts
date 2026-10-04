// Platform insights adapter: fetches performance metrics for a published
// post. Returns null when the integration is not configured or fails -
// callers then skip the record instead of inventing data.

import { resolveIntegration } from "../credentials";

export interface PlatformInsights {
  impressions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  profileVisits: number;
}

async function getJson(url: string, headers: Record<string, string> = {}, timeoutMs = 15_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`insights error ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPlatformInsights(platform: string, externalId: string): Promise<PlatformInsights | null> {
  try {
    switch (platform) {
      case "instagram": {
        const creds = await resolveIntegration("instagram");
        if (!(creds.accessToken && creds.accountId) || !externalId) return null;
        const fields = "impressions,reach,likes,comments,saved,shares,profile_visits,website_clicks";
        const data = (await getJson(
          `https://graph.facebook.com/v21.0/${externalId}/insights?metric=${fields}&access_token=${creds.accessToken}`,
        )) as { data?: { name: string; values: { value: number }[] }[] };
        const map = new Map((data.data ?? []).map((m) => [m.name, m.values?.[0]?.value ?? 0]));
        const num = (k: string) => map.get(k) ?? 0;
        return {
          impressions: num("impressions"),
          views: num("reach"),
          likes: num("likes"),
          comments: num("comments"),
          shares: num("shares"),
          saves: num("saved"),
          clicks: num("website_clicks"),
          profileVisits: num("profile_visits"),
        };
      }
      case "tiktok": {
        const creds = await resolveIntegration("tiktok");
        if (!creds.accessToken || !externalId) return null;
        const data = (await getJson(
          `https://open.tiktokapis.com/v2/video/query/?fields=like_count,comment_count,share_count,view_count`,
          { Authorization: `Bearer ${creds.accessToken}` },
        )) as { data?: { videos?: { like_count?: number; comment_count?: number; share_count?: number; view_count?: number }[] } };
        const v = data.data?.videos?.[0];
        if (!v) return null;
        return {
          impressions: v.view_count ?? 0,
          views: v.view_count ?? 0,
          likes: v.like_count ?? 0,
          comments: v.comment_count ?? 0,
          shares: v.share_count ?? 0,
          saves: 0,
          clicks: 0,
          profileVisits: 0,
        };
      }
      default:
        return null;
    }
  } catch (err) {
    console.error(`[social-insights] ${platform} failed:`, err);
    return null;
  }
}
