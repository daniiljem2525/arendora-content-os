// Research Agent: collects content ideas material - audience pain points,
// market trends, competitor topics, SEO opportunities. Stores everything in
// the database. Never copies third-party content verbatim: search results
// are used as evidence, the copy is written from the insight.

import { prisma, createAgentContext, createLogger, agentGenerate, currentLlmMode } from "./base";
import { search } from "../integrations/search";
import { RESEARCH_TYPES } from "../status";

export interface ResearchRunOptions {
  perType?: number;
  useWeb?: boolean;
  topic?: string;
}

const TYPE_PROMPTS: Record<string, string> = {
  pain_point: "audience pain points",
  trend: "market trends relevant to the product",
  competitor_topic: "topics competitors in property-management content discuss (themes only, never copy)",
  seo_opportunity: "SEO keyword/opportunity clusters",
  audience_question: "questions the audience asks in communities",
};

export async function runResearchAgent(options: ResearchRunOptions = {}) {
  const logger = createLogger();
  const ctx = await createAgentContext(logger);
  const perType = options.perType ?? 2;
  const types = RESEARCH_TYPES.filter((t) => t !== "seo_opportunity" || true);

  logger.log(`Research Agent: mode=${currentLlmMode()}`);
  const created: { id: string; title: string; type: string; source: string }[] = [];

  // Optional web evidence via the search adapter (mock adapter when no key).
  let webEvidence: { title: string; url: string; snippet: string }[] = [];
  if (options.useWeb !== false) {
    const query = options.topic ?? "управление арендой недвижимость собственник проблемы учёт";
    try {
      webEvidence = await search(query, 5);
      logger.log(`search: ${webEvidence.length} results (source=${webEvidence[0] ? "provider" : "none"})`);
    } catch (err) {
      logger.log(`search failed: ${(err as Error).message}`);
    }
  }

  for (const type of types) {
    const { data, mode } = await agentGenerate<{ items: { title: string; summary: string; evidence?: unknown }[] }>(
      ctx,
      "research",
      { count: perType, singleType: type, seed: `${type}:${Date.now()}` },
      `You are the Research Agent for Arendora, a property management SaaS for landlords with 3-30 rental properties. ` +
        `Audience currently uses Excel, Google Sheets, Telegram and notes. ` +
        `Collect ${TYPE_PROMPTS[type] ?? type}. Write ORIGINAL summaries (never copy third-party text verbatim). ` +
        `If a fact is not verifiable, mark it as unknown rather than inventing it.`,
      `Produce ${perType} research items of type "${type}".` +
        (webEvidence.length ? `\nWeb evidence (use only as signals, do not copy): ${JSON.stringify(webEvidence.slice(0, 3))}` : ""),
    );
    const items = Array.isArray(data.items) ? data.items : [];
    for (const item of items.slice(0, perType)) {
      if (!item?.title || !item?.summary) continue;
      const row = await prisma.researchItem.create({
        data: {
          source: mode === "live" ? "web_search+llm" : "builtin_research_pool",
          type,
          title: String(item.title).slice(0, 300),
          summary: String(item.summary),
          evidence: JSON.stringify({ ...(item.evidence ?? {}), web: webEvidence.slice(0, 3) }),
          sourceUrl: webEvidence[0]?.url ?? null,
          score: heuristicScore(type),
          status: "new",
        },
      });
      created.push({ id: row.id, title: row.title, type, source: row.source });
      logger.log(`stored research: [${type}] ${row.title}`);
    }
  }

  return { created, logs: logger.lines() };
}

function heuristicScore(type: string): number {
  switch (type) {
    case "pain_point":
      return 80;
    case "audience_question":
      return 70;
    case "seo_opportunity":
      return 65;
    case "trend":
      return 60;
    case "competitor_topic":
      return 50;
    default:
      return 50;
  }
}
