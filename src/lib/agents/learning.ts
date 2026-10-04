// Learning Agent: analyzes historical performance and extracts actionable
// insights - winning hooks, topics, formats, CTAs, best posting times,
// and which content generates registrations rather than vanity metrics.

import { prisma, createAgentContext, createLogger } from "./base";

function normCta(text: string): string {
  const m = text.match(/arendora\.ru[^\s"]*/i);
  return m ? m[0].toLowerCase() : "(none)";
}

export async function runLearningAgent() {
  const logger = createLogger();
  await createAgentContext(logger);
  logger.log("Learning Agent: analyzing performance history");

  const records = await prisma.analyticsRecord.findMany({
    include: { publication: { include: { variant: { include: { contentItem: { include: { idea: true } } } } } } },
  });

  const withPub = records.filter((r) => r.publication);
  if (withPub.length < 3) {
    logger.log("not enough data yet (<3 records with publications); insights skipped");
    return { insights: [], logs: logger.lines() };
  }

  // Score = registrations*10 + activatedUsers*15 + conversions*40 + websiteVisits (business impact > vanity).
  const impact = (r: (typeof withPub)[number]) =>
    r.registrations * 10 + r.activatedUsers * 15 + r.conversions * 40 + r.websiteVisits;

  // Group by content item (idea/topic).
  const byItem = new Map<string, { title: string; hook: string; cta: string; platform: string; kind: string; score: number; impressions: number }>();
  for (const r of withPub) {
    const pub = r.publication!;
    const item = pub.variant.contentItem;
    let hook = "";
    try {
      const payload = JSON.parse(pub.variant.payload) as Record<string, unknown>;
      hook = String(payload.hook ?? payload.text ?? payload.title ?? "");
    } catch {
      /* ignore */
    }
    const key = item.id;
    const entry = byItem.get(key) ?? {
      title: item.idea.title,
      hook,
      cta: normCta(JSON.stringify(pub.variant.payload)),
      platform: pub.platform,
      kind: pub.variant.kind,
      score: 0,
      impressions: 0,
    };
    entry.score += impact(r);
    entry.impressions += r.impressions;
    byItem.set(key, entry);
  }

  const items = [...byItem.values()].sort((a, b) => b.score - a.score);
  const insights: { kind: string; finding: string; evidence: Record<string, unknown>; confidence: number }[] = [];

  const top = items[0];
  if (top) {
    insights.push({
      kind: "topic",
      finding: `Тема с наибольшим бизнес-эффектом: "${top.title}" (registrations-weighted score ${top.score}).`,
      evidence: { itemTitle: top.title, score: top.score, impressions: top.impressions },
      confidence: Math.min(0.9, items.length / 10),
    });
    if (top.hook) {
      insights.push({
        kind: "hook",
        finding: `Лучший хук по конверсии: "${top.hook}"`,
        evidence: { hook: top.hook, score: top.score },
        confidence: Math.min(0.8, items.length / 12),
      });
    }
  }

  // Winning format.
  const byFormat = new Map<string, number>();
  for (const it of items) byFormat.set(it.kind, (byFormat.get(it.kind) ?? 0) + it.score);
  const bestFormat = [...byFormat.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestFormat) {
    insights.push({
      kind: "format",
      finding: `Формат, приносящий регистрации лучше прочих: ${bestFormat[0]}.`,
      evidence: { format: bestFormat[0], score: bestFormat[1] },
      confidence: Math.min(0.7, items.length / 12),
    });
  }

  // Best posting time: hour of day with highest registrations.
  const byHour = new Map<number, number>();
  for (const r of withPub) byHour.set(r.date.getHours(), (byHour.get(r.date.getHours()) ?? 0) + r.registrations);
  const bestHour = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestHour) {
    insights.push({
      kind: "time",
      finding: `Лучшее время публикации по данным регистраций: около ${bestHour[0]}:00.`,
      evidence: { hour: bestHour[0], registrations: bestHour[1] },
      confidence: 0.5,
    });
  }

  // Winning CTA.
  const byCta = new Map<string, number>();
  for (const it of items) byCta.set(it.cta, (byCta.get(it.cta) ?? 0) + it.score);
  const bestCta = [...byCta.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestCta) {
    insights.push({
      kind: "cta",
      finding: `CTA с лучшим бизнес-эффектом: ${bestCta[0]}`,
      evidence: { cta: bestCta[0], score: bestCta[1] },
      confidence: Math.min(0.6, items.length / 15),
    });
  }

  // Vanity check: format with high impressions but low registrations.
  const worst = items[items.length - 1];
  if (worst && worst !== top && worst.impressions > 0) {
    insights.push({
      kind: "audience",
      finding: `Контент "${worst.title}" собирает показы (${worst.impressions}), но почти не приносит регистраций - пересобрать CTA и оффер.`,
      evidence: { itemTitle: worst.title, impressions: worst.impressions, score: worst.score },
      confidence: 0.4,
    });
  }

  for (const ins of insights) {
    await prisma.learningInsight.create({
      data: { kind: ins.kind, finding: ins.finding, evidence: JSON.stringify(ins.evidence), confidence: ins.confidence },
    });
    logger.log(`insight [${ins.kind}]: ${ins.finding}`);
  }

  return { insights, logs: logger.lines() };
}

/** Top insights to inject into future generation prompts. */
export async function topInsights(limit = 3): Promise<string[]> {
  const rows = await prisma.learningInsight.findMany({
    orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map((r) => r.finding);
}
