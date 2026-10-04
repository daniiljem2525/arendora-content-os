// Site-level analytics adapters: Google Search Console and GA4.
// Both return null when not configured - never fabricate site data.

import { SignJWT, importPKCS8 } from "jose";
import { resolveIntegration } from "../credentials";

export interface SiteMetrics {
  impressions?: number;
  clicks?: number;
  ctr?: number;
  websiteVisits?: number;
  registrations?: number;
  activatedUsers?: number;
  conversions?: number;
}

async function getAccessTokenFromServiceAccount(clientEmail: string, privateKeyRaw: string): Promise<string | null> {
  // RS256 JWT service-account auth via jose (edge-safe, no node: imports).
  const key = privateKeyRaw.replace(/\\n/g, "\n");
  if (!clientEmail || !key) return null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const pk = await importPKCS8(key, "RS256");
    const assertion = await new SignJWT({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(pk);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch (err) {
    console.error("[site-analytics] service account auth failed:", err);
    return null;
  }
}

export async function fetchGscMetrics(): Promise<SiteMetrics | null> {
  const creds = await resolveIntegration("gsc");
  if (!(creds.accessToken && creds.propertyUrl)) return null;
  try {
    const end = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const start = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(creds.propertyUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startDate: start, endDate: end, dimensions: [] }),
      },
    );
    if (!res.ok) throw new Error(`GSC error ${res.status}`);
    const json = (await res.json()) as { rows?: { clicks: number; impressions: number; ctr: number }[] };
    const row = json.rows?.[0];
    if (!row) return null;
    return { clicks: row.clicks, impressions: row.impressions, ctr: Number((row.ctr * 100).toFixed(2)) };
  } catch (err) {
    console.error("[site-analytics] GSC failed:", err);
    return null;
  }
}

export async function fetchGa4Metrics(): Promise<SiteMetrics | null> {
  const creds = await resolveIntegration("ga4");
  if (!(creds.propertyId && creds.clientEmail && creds.privateKey)) return null;
  const token = await getAccessTokenFromServiceAccount(creds.clientEmail, creds.privateKey);
  if (!token) return null;
  try {
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${creds.propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "yesterday" }],
        metrics: [{ name: "sessions" }, { name: "conversions" }],
      }),
    });
    if (!res.ok) throw new Error(`GA4 error ${res.status}`);
    const json = (await res.json()) as { rows?: { metricValues: { value: string }[] }[] };
    const row = json.rows?.[0];
    return {
      websiteVisits: Number(row?.metricValues?.[0]?.value ?? 0),
      conversions: Number(row?.metricValues?.[1]?.value ?? 0),
    };
  } catch (err) {
    console.error("[site-analytics] GA4 failed:", err);
    return null;
  }
}

export async function fetchSiteMetrics(): Promise<SiteMetrics | null> {
  const gsc = await fetchGscMetrics();
  const ga4 = await fetchGa4Metrics();
  if (!gsc && !ga4) return null;
  return { ...gsc, ...ga4 };
}
