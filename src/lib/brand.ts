// Brand knowledge base loader + brand guard.
//
// CRITICAL RULE: never invent Arendora features, prices, customers,
// statistics or claims. The guard scans generated content for the most
// common fabrication patterns (invented numbers, guarantee language,
// customer counts) and flags them for QA rejection.

import { prisma } from "./db";

export interface BrandContext {
  rules: Record<string, string>; // key -> value (markdown)
  facts: { title: string; category: string; body: string; verified: boolean }[];
  compiled: string; // compiled prompt block
}

export async function loadBrandContext(): Promise<BrandContext> {
  const [rules, facts] = await Promise.all([
    prisma.brandRule.findMany(),
    prisma.productKnowledge.findMany({ where: { verified: true } }),
  ]);
  const ruleMap: Record<string, string> = {};
  for (const r of rules) ruleMap[r.key] = r.value;
  return {
    rules: ruleMap,
    facts: facts.map((f) => ({ title: f.title, category: f.category, body: f.body, verified: f.verified })),
    compiled: compileBrandBlock(ruleMap, facts),
  };
}

function compileBrandBlock(
  rules: Record<string, string>,
  facts: { title: string; category: string; body: string; verified: boolean }[],
): string {
  const lines: string[] = [
    "## Arendora brand knowledge (authoritative - never contradict or extend)",
    "",
  ];
  for (const [key, value] of Object.entries(rules)) {
    lines.push(`### ${key.replace(/_/g, " ")}`);
    lines.push(value.trim());
    lines.push("");
  }
  lines.push("### Verified product facts");
  if (facts.length === 0) {
    lines.push("(none recorded - treat all product specifics as unknown)");
  } else {
    for (const f of facts) {
      lines.push(`- [${f.category}] ${f.title}: ${f.body}`);
    }
  }
  lines.push("");
  lines.push(
    "HARD RULE: Never invent Arendora features, prices, customers, statistics or claims. " +
      "If a specific fact is not listed above, write it as unknown or omit it. " +
      "Never copy third-party content verbatim - always express insights in original words.",
  );
  return lines.join("\n");
}

// --- Brand guard -------------------------------------------------------

// Patterns that usually indicate a fabricated claim. Tuned for Russian +
// English marketing copy.
const FABRICATION_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /((рост|увеличение|прирост|экономия|сокращение)\s*(на)?\s*\d{1,3}\s?%)|(\d{1,3}\s?%\s*(рост|увеличение|прирост|эконом|сокращ))|((increase|grow|boost|improve|reduce|save)[a-z]*\s*[a-z ]{0,20}\bby\s?\d{1,3}\s?%)/i,
    reason: "Contains a specific percentage claim that is not in the knowledge base",
  },
  {
    pattern: /(гаранти|garantee|guarantee)/i,
    reason: "Guarantee language is a prohibited claim",
  },
  {
    pattern: /((более|свыше|over|more than)\s*\d[\d\s.,]{1,9}\s*(тысяч|млн|k)?\s*(клиент|пользоват|арендодател|landlord|customer|user))|((trusted by|нам доверяют)\b.{0,40}\d+)/i,
    reason: "Customer/user count claims must come from verified facts",
  },
  {
    pattern: /\b\d+\s*(руб|₽|\$|eur|евро)\b/i,
    reason: "Specific price detected - prices must come from the knowledge base",
  },
];

export interface GuardResult {
  ok: boolean;
  violations: string[];
}

export function brandGuard(text: string): GuardResult {
  const violations: string[] = [];
  for (const { pattern, reason } of FABRICATION_PATTERNS) {
    if (pattern.test(text)) violations.push(reason);
  }
  return { ok: violations.length === 0, violations };
}
