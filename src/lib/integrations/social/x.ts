// X (Twitter) publishing adapter.
// Supports the 4 credentials straight from developer.x.com (OAuth 1.0a,
// HMAC-SHA256 signing) and an OAuth 2.0 user-context bearer token fallback.

import { createHmac, randomBytes } from "node:crypto";
import { isComplete, resolveIntegration } from "../../credentials";
import type { PublishResult } from "./instagram";

function percentEncode(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauth1Header(
  creds: { apiKey: string; apiSecret: string; accessToken: string; accessTokenSecret: string },
  url: string,
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };
  const paramStr = Object.keys(oauth)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauth[k])}`)
    .join("&");
  const baseStr = ["POST", percentEncode(url), percentEncode(paramStr)].join("&");
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessTokenSecret)}`;
  const signature = createHmac("sha256", signingKey).update(baseStr).digest("base64");
  const withSig = { ...oauth, oauth_signature: signature };
  return (
    "OAuth " +
    Object.entries(withSig)
      .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
      .join(", ")
  );
}

export const xAdapter = {
  key: "x",

  async isConfigured(): Promise<boolean> {
    return isComplete("x", await resolveIntegration("x"));
  },

  async publish(input: { text: string }): Promise<PublishResult> {
    const creds = await resolveIntegration("x");
    const oauth1 = !!(creds.apiKey && creds.apiSecret && creds.accessToken && creds.accessTokenSecret);
    if (!oauth1 && !creds.accessToken) {
      return {
        ok: false,
        mode: "mock",
        error: "X API не настроен (нужны 4 ключа из developer.x.com в Настройках) - публикация остаётся в режиме mock",
      };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (oauth1) {
        headers.Authorization = oauth1Header(creds as never, "https://api.twitter.com/2/tweets");
      } else {
        headers.Authorization = `Bearer ${creds.accessToken}`;
      }
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers,
        body: JSON.stringify({ text: input.text.slice(0, 280) }),
        signal: controller.signal,
      });
      const json = (await res.json()) as { data?: { id: string }; errors?: { message: string }[]; detail?: string };
      if (!res.ok || json.errors?.length) {
        throw new Error(json.errors?.[0]?.message ?? json.detail ?? `X API error ${res.status}`);
      }
      return { ok: true, mode: "live", externalId: json.data?.id };
    } catch (err) {
      const e = err as Error & { cause?: { code?: string; message?: string } };
      const cause = e.cause?.code ?? e.cause?.message;
      return { ok: false, mode: "live", error: cause ? `${e.message} (${cause})` : e.message };
    } finally {
      clearTimeout(timer);
    }
  },
};
