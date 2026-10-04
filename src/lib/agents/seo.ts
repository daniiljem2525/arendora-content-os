// SEO Agent: keyword research, then full article generation. Articles must
// be genuinely useful, not mass-generated filler: real structure, concrete
// checklists, honest "unknown" where data is missing.

import { prisma, createAgentContext, createLogger, agentGenerate } from "./base";

export interface SeoArticleData {
  keyword: string;
  intent: string;
  cluster: string;
  title: string;
  metaDescription: string;
  h1: string;
  outline: unknown;
  body: string;
  internalLinks: unknown;
  faq: { q: string; a: string }[];
  cta: string;
}

export async function runSeoResearch(count = 5) {
  const logger = createLogger();
  const ctx = await createAgentContext(logger);
  logger.log(`SEO Agent: keyword research (target ${count})`);

  const { data } = await agentGenerate<{ keywords: { phrase: string; intent: string; cluster: string; volume: number | null; difficulty: number | null }[] }>(
    ctx,
    "research",
    { count, singleType: "seo_opportunity", seed: `seo:${Date.now()}` },
    "You are the SEO Agent for Arendora (property management SaaS, Russian market). " +
      "Suggest keyword opportunities around managing rental properties, tenants, payments and portfolio performance. " +
      "Volume/difficulty are UNKNOWN unless real data is provided - use null instead of guessing.",
    `Produce ${count} keyword opportunities as JSON { keywords: [{ phrase, intent, cluster, volume, difficulty }] }.`,
  );

  const keywords = Array.isArray(data.keywords) ? data.keywords : [];
  const created: string[] = [];
  for (const k of keywords.slice(0, count)) {
    if (!k?.phrase) continue;
    const exists = await prisma.keyword.findFirst({ where: { phrase: k.phrase } });
    if (exists) continue;
    const row = await prisma.keyword.create({
      data: {
        phrase: k.phrase,
        intent: k.intent ?? "informational",
        cluster: k.cluster ?? null,
        volume: typeof k.volume === "number" ? k.volume : null,
        difficulty: typeof k.difficulty === "number" ? k.difficulty : null,
        source: "seo_agent",
      },
    });
    created.push(row.id);
    logger.log(`keyword stored: ${row.phrase} (${row.intent})`);
  }
  return { created, logs: logger.lines() };
}

export async function runSeoArticle(keywordId: string) {
  const logger = createLogger();
  const ctx = await createAgentContext(logger);

  const keyword = await prisma.keyword.findUnique({ where: { id: keywordId } });
  if (!keyword) throw new Error(`Keyword not found: ${keywordId}`);

  logger.log(`SEO Agent: article for "${keyword.phrase}"`);
  const { data } = await agentGenerate<SeoArticleData>(
    ctx,
    "seo_article",
    { keyword: keyword.phrase, intent: keyword.intent, cluster: keyword.cluster ?? "", seed: `${keyword.id}:${Date.now()}` },
    "You are the SEO Agent for Arendora. Write a genuinely useful article (no filler): concrete steps, " +
      "checklists, honest statements. Russian language. Never invent product facts, prices or statistics; " +
      "if unknown, omit or mark unknown. JSON shape: " +
      "{ keyword, intent, cluster, title, metaDescription, h1, outline, body (markdown), internalLinks, faq[{q,a}], cta }.",
    `Target keyword: "${keyword.phrase}", intent: ${keyword.intent}, cluster: ${keyword.cluster ?? "general"}.`,
  );

  const article = await prisma.seoArticle.create({
    data: {
      keywordId: keyword.id,
      title: data.title,
      metaDescription: data.metaDescription,
      h1: data.h1,
      outline: JSON.stringify(data.outline ?? []),
      body: data.body,
      internalLinks: JSON.stringify(data.internalLinks ?? []),
      faqSchema: JSON.stringify(data.faq ?? []),
      cta: data.cta,
      status: "ai_review",
    },
  });
  await prisma.keyword.update({ where: { id: keyword.id }, data: { status: "targeting" } });
  logger.log(`article stored: ${article.id}`);

  return { articleId: article.id, logs: logger.lines() };
}
