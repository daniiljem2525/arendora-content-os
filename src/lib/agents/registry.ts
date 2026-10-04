// Agent registry: workflow name -> executable. Used by the scheduler,
// the API and the agents dashboard page.

import { runResearchAgent } from "./research";
import { runStrategyAgent } from "./strategy";
import { runContentAgent } from "./content";
import { runVideoAgent } from "./video";
import { runQaAgent } from "./qa";
import { runSeoResearch, runSeoArticle } from "./seo";
import { runAnalyticsAgent } from "./analytics";
import { runLearningAgent } from "./learning";
import { prisma } from "../db";

export interface WorkflowResult {
  ok: boolean;
  summary: Record<string, unknown>;
  logs: string[];
}

export type WorkflowFn = (payload: Record<string, unknown>) => Promise<WorkflowResult>;

export const WORKFLOWS: Record<string, WorkflowFn> = {
  daily_research: async (p) => {
    const r = await runResearchAgent({ perType: typeof p.perType === "number" ? p.perType : 1 });
    return { ok: true, summary: { created: r.created.length }, logs: r.logs };
  },

  daily_ideas: async (p) => {
    const logger = (await import("./base")).createLogger();
    const research = await prisma.researchItem.findMany({ where: { status: "new" }, take: 20 });
    const count = typeof p.count === "number" ? p.count : 5;
    const seed = String(Date.now());
    const { agentGenerate, createAgentContext } = await import("./base");
    const ctx = await createAgentContext(logger);
    const { data } = await agentGenerate<{ ideas: { title: string; angle: string; researchTitle: string; rationale: string }[] }>(
      ctx,
      "ideas",
      { count, seed, research: research.map((r) => ({ title: r.title, summary: r.summary })) },
      "You are the Idea Generation Agent for Arendora (property management SaaS for landlords with 3-30 properties). " +
        "Turn research insights into concrete content ideas. Each idea: title, angle (how to present it), researchTitle (which insight it builds on), rationale.",
      `Produce ${count} content ideas from these research insights: ${JSON.stringify(research.slice(0, 10).map((r) => ({ title: r.title, summary: r.summary })))}`,
    );
    const created: string[] = [];
    for (const idea of data.ideas.slice(0, count)) {
      const link = research.find((r) => r.title === idea.researchTitle);
      const row = await prisma.idea.create({
        data: {
          title: String(idea.title).slice(0, 300),
          angle: String(idea.angle ?? ""),
          researchItemId: link?.id ?? null,
          rationale: idea.rationale ?? null,
        },
      });
      created.push(row.id);
      logger.log(`idea created: ${row.title}`);
    }
    for (const r of research) {
      await prisma.researchItem.update({ where: { id: r.id }, data: { status: "used" } });
    }
    return { ok: true, summary: { created: created.length }, logs: logger.lines() };
  },

  weekly_strategy: async (p) => {
    const r = await runStrategyAgent({ weekCount: typeof p.weekCount === "number" ? p.weekCount : 5 });
    return { ok: true, summary: { selected: r.selected.length, planId: r.planId }, logs: r.logs };
  },

  content_production: async (p) => {
    const selected = await prisma.idea.findMany({ where: { status: "selected" }, orderBy: { totalScore: "desc" }, take: 5 });
    const produced: string[] = [];
    for (const idea of selected) {
      const r = await runContentAgent(idea.id);
      produced.push(r.contentItemId);
    }
    return { ok: true, summary: { produced: produced.length, contentItemIds: produced }, logs: [`produced ${produced.length} content items`] };
  },

  video_production: async (p) => {
    const contentItemId = String(p.contentItemId ?? "");
    const r = await runVideoAgent(contentItemId);
    return { ok: true, summary: { variantId: r.variantId }, logs: r.logs };
  },

  seo_research: async (p) => {
    const r = await runSeoResearch(typeof p.count === "number" ? p.count : 5);
    return { ok: true, summary: { keywordsCreated: r.created.length }, logs: r.logs };
  },

  seo_article: async (p) => {
    const r = await runSeoArticle(String(p.keywordId ?? ""));
    return { ok: true, summary: { articleId: r.articleId }, logs: r.logs };
  },

  qa_review: async (p) => {
    const r = await runQaAgent(p.variantId ? String(p.variantId) : undefined);
    return { ok: true, summary: { reviewed: r.reviewed }, logs: r.logs };
  },

  analytics_collection: async (p) => {
    const r = await runAnalyticsAgent(typeof p.days === "number" ? p.days : 7);
    return { ok: true, summary: { recordsCreated: r.recordsCreated, mock: r.mock }, logs: r.logs };
  },

  learning: async () => {
    const r = await runLearningAgent();
    return { ok: true, summary: { insights: r.insights.length }, logs: r.logs };
  },

  publish_scheduled: async () => {
    const { publishVariant } = await import("../integrations/social");
    const due = await prisma.contentItem.findMany({
      where: {
        status: "approved",
        scheduledAt: { lte: new Date() },
      },
      include: {
        variants: {
          where: {
            status: "approved",
            platform: { not: "seo" },
            // Publish each variant once - skip those already published or
            // staged as mock; failed publications are retried automatically.
            publications: { none: { status: { in: ["published", "mock"] } } },
          },
        },
      },
      take: 20,
    });
    const results: { contentItemId: string; status: string }[] = [];
    for (const item of due) {
      for (const variant of item.variants) {
        const r = await publishVariant(variant.id);
        results.push({ contentItemId: item.id, status: r.status });
      }
    }
    return { ok: true, summary: { processed: results.length, results }, logs: [`publish_scheduled processed ${results.length} variants`] };
  },

  weekly_report: async () => {
    const { analyticsSummary } = await import("./analytics");
    const summary = await analyticsSummary(7);
    const { sendTelegramMessage } = await import("../integrations/telegram");
    const text =
      `Arendora Content OS - weekly report\n` +
      `Impressions: ${summary.impressions}\nClicks: ${summary.clicks}\nWebsite visits: ${summary.websiteVisits}\n` +
      `Registrations: ${summary.registrations}\nActivated: ${summary.activatedUsers}\nConversions: ${summary.conversions}\n` +
      `Data source: ${summary.isMock ? "MOCK (labeled)" : "live integrations"}`;
    const sent = await sendTelegramMessage(text);
    return { ok: true, summary: { notified: sent.mode, analytics: summary }, logs: [text] };
  },
};

export function getWorkflow(name: string): WorkflowFn | undefined {
  return WORKFLOWS[name];
}

export const WORKFLOW_NAMES = Object.keys(WORKFLOWS);
