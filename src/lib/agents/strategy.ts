// Strategy Agent: scores ideas (virality, relevance, differentiation,
// conversion potential), prioritizes by business impact and produces a
// weekly content strategy (selected ideas + rationale, stored in DB).

import { prisma, createAgentContext, createLogger, weekStartISO, currentLlmMode } from "./base";

const CONVERTING_WORDS = ["платеж", "просроч", "напоминан", "долг", "учет", "доходност", "портфел", "payment", "rent", "overdue"];
const VIRAL_WORDS = ["ошибк", "почему", "хватит", "перестан", "мистак", "mistake", "stop", "why", "was/stало", "было"];

export interface ScoredIdea {
  id: string;
  virality: number;
  relevance: number;
  differentiation: number;
  conversion: number;
  totalScore: number;
}

/**
 * Transparent heuristic scoring. Business impact (registrations potential)
 * is weighted highest, matching the marketing goal.
 */
export function scoreIdeaText(title: string, angle: string): Omit<ScoredIdea, "id"> {
  const text = `${title} ${angle}`.toLowerCase();
  const has = (words: string[]) => words.some((w) => text.includes(w));
  const virality = Math.min(100, 45 + (has(VIRAL_WORDS) ? 30 : 0) + (title.length < 70 ? 15 : 5));
  const relevance = Math.min(100, 60 + (has(CONVERTING_WORDS) ? 25 : 0) + 10);
  const differentiation = Math.min(100, 55 + (has(["чек-лист", "скрин", "интерфейс", "как"]) ? 20 : 0));
  const conversion = Math.min(100, 40 + (has(CONVERTING_WORDS) ? 35 : 0) + (has(["arendora", "систем", "сервис"]) ? 15 : 0));
  const totalScore = Math.round((virality * 0.2 + relevance * 0.3 + differentiation * 0.2 + conversion * 0.3) * 10) / 10;
  return { virality, relevance, differentiation, conversion, totalScore };
}

export async function runStrategyAgent(options: { weekCount?: number; campaignId?: string } = {}) {
  const logger = createLogger();
  const ctx = await createAgentContext(logger);
  logger.log(`Strategy Agent: mode=${currentLlmMode()}`);

  const candidates = await prisma.idea.findMany({
    where: { status: "new" },
    include: { researchItem: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (candidates.length === 0) {
    logger.log("no new ideas to score; nothing to do");
    return { selected: [], planId: null, logs: logger.lines() };
  }

  const scored: ScoredIdea[] = [];
  for (const idea of candidates) {
    const s = scoreIdeaText(idea.title, idea.angle ?? "");
    await prisma.idea.update({
      where: { id: idea.id },
      data: {
        virality: s.virality,
        relevance: s.relevance,
        differentiation: s.differentiation,
        conversion: s.conversion,
        totalScore: s.totalScore,
      },
    });
    scored.push({ id: idea.id, ...s });
  }
  scored.sort((a, b) => b.totalScore - a.totalScore);

  const weekCount = options.weekCount ?? 5;
  const selected = scored.slice(0, weekCount);

  for (const s of selected) {
    await prisma.idea.update({
      where: { id: s.id },
      data: {
        status: "selected",
        campaignId: options.campaignId ?? undefined,
        rationale: `Selected for weekly strategy: total score ${s.totalScore} (conversion-weighted).`,
      },
    });
  }
  const rejectedCount = candidates.length - selected.length;
  for (const s of scored.slice(weekCount)) {
    await prisma.idea.update({ where: { id: s.id }, data: { status: "rejected" } });
  }

  const plan = await prisma.strategyPlan.create({
    data: {
      weekStart: weekStartISO(),
      ideaIds: JSON.stringify(selected.map((s) => s.id)),
      notes:
        `Weekly strategy: top ${selected.length} ideas by business impact ` +
        `(weights: conversion 30%, relevance 30%, virality 20%, differentiation 20%). ` +
        `${rejectedCount} ideas below the bar were rejected.`,
      status: "active",
    },
  });
  logger.log(`strategy plan created: ${plan.id}, selected ${selected.length}/${candidates.length} ideas`);

  return { selected, planId: plan.id, logs: logger.lines() };
}
