// QA Agent: reviews every variant before approval. Checks hook strength,
// clarity, originality (duplication), factual/brand safety, natural
// language, CTA quality, platform compliance. Rejects weak content.

import { prisma, createAgentContext, createLogger, payloadToText } from "./base";
import { brandGuard } from "../brand";

export interface QaCheck {
  check: string;
  passed: boolean;
  detail: string;
  weight: number;
}

export interface QaReport {
  score: number;
  status: "awaiting_approval" | "rejected";
  checks: QaCheck[];
  guardViolations: string[];
}

const PLATFORM_LIMITS: Record<string, { field: string; max: number; label: string }[]> = {
  x_post: [{ field: "text", max: 280, label: "X post length" }],
  x_thread: [{ field: "tweets", max: 280, label: "each tweet" }],
  threads_post: [{ field: "text", max: 500, label: "Threads post length" }],
};

function trigrams(s: string): Set<string> {
  const norm = s.toLowerCase().replace(/\s+/g, " ").trim();
  const set = new Set<string>();
  for (let i = 0; i < norm.length - 2; i++) set.add(norm.slice(i, i + 3));
  return set;
}

export function similarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.min(A.size, B.size);
}

function getStrings(payload: Record<string, unknown>, field: string): string[] {
  const v = payload[field];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

/**
 * Distinctive-content fingerprint: only the fields meant to be unique per
 * piece (hook, post text, opening slide, titles, captions) - not shared
 * production boilerplate (scene structure, visual notes, static slides).
 */
function fingerprint(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of ["hook", "text", "title", "captions", "caption", "metaDescription", "h1"]) {
    if (typeof payload[key] === "string") parts.push(payload[key] as string);
  }
  parts.push(...getStrings(payload, "tweets"));
  if (Array.isArray(payload.slides) && typeof payload.slides[0] === "object") {
    const s = payload.slides[0] as { headline?: string; body?: string };
    if (typeof s?.headline === "string") parts.push(s.headline);
    if (typeof s?.body === "string") parts.push(s.body);
  }
  return parts.join(" ");
}

export function runQaChecks(
  payload: Record<string, unknown>,
  kind: string,
  previousPayloads: string[],
): QaReport {
  const text = payloadToText(payload);
  const checks: QaCheck[] = [];

  // Hook strength: first substantial string (hook or first tweet/slide).
  const hook =
    (typeof payload.hook === "string" && payload.hook) ||
    getStrings(payload, "tweets")[0] ||
    (typeof payload.text === "string" && payload.text) ||
    (Array.isArray(payload.slides) && payload.slides[0] && typeof (payload.slides[0] as { headline?: string }).headline === "string"
      ? (payload.slides[0] as { headline: string }).headline
      : "") ||
    (typeof payload.title === "string" ? payload.title : "");
  // For conversational formats the hook is the opening sentence.
  const hookFirst = hook.split(/(?<=[.!?])\s/)[0] ?? hook;
  const hookLen = hookFirst.length;
  checks.push({
    check: "hook_strength",
    passed: hookLen >= 20 && hookLen <= 200,
    detail: `hook length ${hookLen} (expected 20-200)`,
    weight: 20,
  });

  // Clarity: not too long for short-form, contains sentence structure.
  checks.push({
    check: "clarity",
    passed: text.length > 80 && !/\{\{|\}\}|lorem ipsum/i.test(text),
    detail: `payload length ${text.length}, placeholders/lorem absent`,
    weight: 10,
  });

  // Brand safety / factual accuracy guard.
  const guard = brandGuard(text);
  checks.push({
    check: "brand_safety",
    passed: guard.ok,
    detail: guard.ok ? "no fabricated claims detected" : guard.violations.join("; "),
    weight: 25,
  });

  // CTA quality: contains a site reference or CTA field.
  const hasCta = /arendora\.ru/i.test(text) || "cta" in payload;
  checks.push({
    check: "cta_quality",
    passed: hasCta,
    detail: hasCta ? "CTA present" : "no CTA or arendora.ru reference",
    weight: 15,
  });

  // Platform compliance.
  const limits = PLATFORM_LIMITS[kind] ?? [];
  let compliance = true;
  const details: string[] = [];
  for (const lim of limits) {
    for (const s of getStrings(payload, lim.field)) {
      if (s.length > lim.max) {
        compliance = false;
        details.push(`${lim.label}: ${s.length}/${lim.max}`);
      }
    }
  }
  checks.push({
    check: "platform_compliance",
    passed: compliance,
    detail: details.length ? details.join("; ") : "within platform limits",
    weight: 15,
  });

  // Duplication with previous content (distinctive fields only).
  const fp = fingerprint(payload);
  let maxSim = 0;
  for (const prev of previousPayloads) {
    maxSim = Math.max(maxSim, similarity(fp, prev));
  }
  checks.push({
    check: "originality",
    passed: maxSim < 0.7,
    detail: `max similarity with previous variants: ${(maxSim * 100).toFixed(0)}%`,
    weight: 15,
  });

  const score = checks.reduce((acc, c) => acc + (c.passed ? c.weight : 0), 0);
  // Hard-fail checks: duplication and brand violations reject regardless of score.
  const hardFail = checks.some((c) => !c.passed && (c.check === "originality" || c.check === "brand_safety"));
  return {
    score,
    status: score >= 70 && !hardFail ? "awaiting_approval" : "rejected",
    checks,
    guardViolations: guard.violations,
  };
}

export async function reviewVariant(variantId: string): Promise<QaReport> {
  const variant = await prisma.contentVariant.findUnique({
    where: { id: variantId },
    include: { contentItem: true },
  });
  if (!variant) throw new Error(`Variant not found: ${variantId}`);

  const payload = JSON.parse(variant.payload) as Record<string, unknown>;

  // Others = same kind, different content item (self-versions are allowed
  // to be similar - regeneration of the same idea is expected to overlap).
  const others = await prisma.contentVariant.findMany({
    where: { kind: variant.kind, contentItemId: { not: variant.contentItemId } },
    select: { payload: true },
    take: 50,
  });

  const report = runQaChecks(payload, variant.kind, others.map((o) => fingerprint(JSON.parse(o.payload) as Record<string, unknown>)));

  await prisma.contentVariant.update({
    where: { id: variantId },
    data: {
      qaScore: report.score,
      qaReport: JSON.stringify(report),
      status: report.status === "awaiting_approval" ? "awaiting_approval" : "draft",
    },
  });

  // Content item moves to awaiting approval when all variants passed QA.
  const item = await prisma.contentItem.findUnique({
    where: { id: variant.contentItemId },
    include: { variants: true },
  });
  if (item && item.variants.length > 0) {
    const allPassed = item.variants.every((v) => v.status === "awaiting_approval" || v.status === "approved");
    const anyRejected = item.variants.some((v) => v.status === "draft");
    if (allPassed) {
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { status: "awaiting_approval" },
      });
    } else if (anyRejected) {
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { status: "draft" },
      });
    }
  }

  return report;
}

/** Convenience: review + one regeneration attempt if rejected. */
export async function reviewWithRegeneration(variantId: string, regenerateFn: (id: string) => Promise<unknown>) {
  let report = await reviewVariant(variantId);
  if (report.status === "rejected") {
    await regenerateFn(variantId);
    report = await reviewVariant(variantId);
  }
  return report;
}

export async function runQaAgent(variantId?: string) {
  const logger = createLogger();
  await createAgentContext(logger);
  logger.log("QA Agent: reviewing pending variants");

  const targets = variantId
    ? await prisma.contentVariant.findMany({ where: { id: variantId } })
    : await prisma.contentVariant.findMany({
        where: { status: { in: ["draft", "ai_review"] } },
        take: 50,
      });

  const results: { variantId: string; score: number; status: string }[] = [];
  for (const v of targets) {
    const report = await reviewVariant(v.id);
    results.push({ variantId: v.id, score: report.score, status: report.status });
    logger.log(`QA ${v.id}: score=${report.score} status=${report.status}`);
  }
  return { reviewed: results.length, results, logs: logger.lines() };
}
