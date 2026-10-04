// Analytics Agent: stores performance metrics per publication and site-level
// metrics from GSC/GA4. With no live integrations it can seed clearly-labeled
// mock metrics (isMock=true, gated by ANALYTICS_MOCK_DATA=true) for local
// development. Mock data is never mixed silently with real data.

import { prisma, createAgentContext, createLogger } from "./base";
import { env } from "../env";
import { fetchPlatformInsights } from "../integrations/social-insights";
import { fetchSiteMetrics } from "../integrations/site-analytics";

export interface CollectResult {
  recordsCreated: number;
  liveSources: string[];
  mock: boolean;
}

function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Deterministic demo metrics, always flagged isMock. */
export function generateMockMetrics(publicationId: string, platform: string, day: Date) {
  const rnd = seededRandom(`${publicationId}:${day.toISOString().slice(0, 10)}`);
  const impressions = Math.floor(300 + rnd() * 2500);
  const views = Math.floor(impressions * (0.4 + rnd() * 0.4));
  const likes = Math.floor(views * (0.02 + rnd() * 0.06));
  const comments = Math.floor(likes * (0.02 + rnd() * 0.08));
  const shares = Math.floor(likes * (0.05 + rnd() * 0.15));
  const saves = Math.floor(likes * (0.1 + rnd() * 0.2));
  const clicks = Math.floor(views * (0.01 + rnd() * 0.03));
  const websiteVisits = Math.floor(clicks * (0.7 + rnd() * 0.3));
  const registrations = Math.floor(websiteVisits * (0.03 + rnd() * 0.07));
  const activatedUsers = Math.floor(registrations * (0.3 + rnd() * 0.4));
  const conversions = Math.floor(activatedUsers * (0.05 + rnd() * 0.2));
  return {
    publicationId,
    platform,
    date: day,
    impressions,
    views,
    likes,
    comments,
    shares,
    saves,
    clicks,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    profileVisits: Math.floor(views * (0.01 + rnd() * 0.02)),
    websiteVisits,
    registrations,
    activatedUsers,
    conversions,
    isMock: true,
  };
}

export async function runAnalyticsAgent(days = 7) {
  const logger = createLogger();
  const ctx = await createAgentContext(logger);
  logger.log(`Analytics Agent: collecting metrics (last ${days} days)`);
  let recordsCreated = 0;
  const liveSources: string[] = [];

  const publications = await prisma.publication.findMany({
    where: { status: { in: ["published", "mock"] } },
    include: { variant: { include: { contentItem: { include: { idea: true } } } } },
  });

  for (const pub of publications) {
    if (pub.mode === "live") {
      const insights = await fetchPlatformInsights(pub.platform, pub.externalId ?? "");
      if (insights) {
        liveSources.push(pub.platform);
        await prisma.analyticsRecord.create({
          data: { publicationId: pub.id, platform: pub.platform, date: new Date(), ...insights, isMock: false },
        });
        recordsCreated++;
        continue;
      }
      logger.log(`no live insights for ${pub.platform} publication ${pub.id} (integration unavailable)`);
    }
    if (env.analyticsMockData) {
      for (let d = 1; d <= days; d++) {
        const day = new Date(Date.now() - d * 86_400_000);
        const existing = await prisma.analyticsRecord.findFirst({
          where: { publicationId: pub.id, date: { gte: new Date(day.toISOString().slice(0, 10)) } },
        });
        if (existing) continue;
        await prisma.analyticsRecord.create({ data: generateMockMetrics(pub.id, pub.platform, day) });
        recordsCreated++;
      }
    }
  }

  // Site-level metrics (GSC / GA4) or labeled site mock rows.
  const site = await fetchSiteMetrics();
  if (site) {
    liveSources.push("gsc/ga4");
    await prisma.analyticsRecord.create({
      data: {
        publicationId: null,
        platform: "site",
        date: new Date(),
        impressions: site.impressions ?? 0,
        clicks: site.clicks ?? 0,
        websiteVisits: site.websiteVisits ?? 0,
        registrations: site.registrations ?? 0,
        activatedUsers: site.activatedUsers ?? 0,
        conversions: site.conversions ?? 0,
        ctr: site.ctr ?? 0,
        isMock: false,
      },
    });
    recordsCreated++;
  } else if (env.analyticsMockData) {
    const rnd = seededRandom(`site:${new Date().toISOString().slice(0, 10)}`);
    await prisma.analyticsRecord.create({
      data: {
        publicationId: null,
        platform: "site",
        date: new Date(),
        impressions: Math.floor(2000 + rnd() * 4000),
        clicks: Math.floor(100 + rnd() * 300),
        ctr: Number((2 + rnd() * 3).toFixed(2)),
        websiteVisits: Math.floor(400 + rnd() * 600),
        registrations: Math.floor(10 + rnd() * 30),
        activatedUsers: Math.floor(3 + rnd() * 10),
        conversions: Math.floor(rnd() * 4),
        isMock: true,
      },
    });
    recordsCreated++;
    logger.log("site metrics: mock (ANALYTICS_MOCK_DATA=true, clearly labeled)");
  }

  logger.log(`analytics records created: ${recordsCreated}`);
  const result: CollectResult = { recordsCreated, liveSources, mock: liveSources.length === 0 };
  return { ...result, logs: logger.lines() };
}

/** Aggregated funnel summary for the dashboard. */
export async function analyticsSummary(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const records = await prisma.analyticsRecord.findMany({ where: { date: { gte: since } } });
  const sum = (fn: (r: (typeof records)[number]) => number) => records.reduce((a, r) => a + fn(r), 0);
  const byPlatform: Record<string, { impressions: number; clicks: number; registrations: number; conversions: number; isMock: boolean }> = {};
  for (const r of records) {
    const p = (byPlatform[r.platform] ??= { impressions: 0, clicks: 0, registrations: 0, conversions: 0, isMock: r.isMock });
    p.impressions += r.impressions;
    p.clicks += r.clicks;
    p.registrations += r.registrations;
    p.conversions += r.conversions;
  }
  return {
    days,
    impressions: sum((r) => r.impressions),
    views: sum((r) => r.views),
    likes: sum((r) => r.likes),
    comments: sum((r) => r.comments),
    shares: sum((r) => r.shares),
    saves: sum((r) => r.saves),
    clicks: sum((r) => r.clicks),
    profileVisits: sum((r) => r.profileVisits),
    websiteVisits: sum((r) => r.websiteVisits),
    registrations: sum((r) => r.registrations),
    activatedUsers: sum((r) => r.activatedUsers),
    conversions: sum((r) => r.conversions),
    isMock: records.length > 0 && records.every((r) => r.isMock),
    byPlatform: Object.entries(byPlatform).map(([platform, v]) => ({ platform, ...v })),
  };
}
