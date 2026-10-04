// Seed: brand knowledge base, platforms, admin user, default jobs,
// a starter campaign and starter keywords.
// Run: npm run db:seed

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

const BRAND_RULES: { key: string; category: string; value: string }[] = [
  {
    key: "positioning",
    category: "identity",
    value:
      "Arendora helps property owners manage rental properties, tenants, payments and portfolio performance in one place.\n" +
      "Website: arendora.ru. Product category: property management SaaS.",
  },
  {
    key: "audience",
    category: "identity",
    value:
      "- landlords with 3-30 rental properties\n" +
      "- small property managers\n" +
      "- owners who currently use Excel, Google Sheets, Telegram, notes and scattered tools",
  },
  {
    key: "tone_of_voice",
    category: "voice",
    value:
      "- Practical, calm, respectful. Speak to the owner as an equal, not a beginner.\n" +
      "- Concrete over hype: show scenarios, screens and steps instead of buzzwords.\n" +
      "- Short sentences. No aggressive sales language.\n" +
      "- Russian language for arendora.ru content unless explicitly requested otherwise.",
  },
  {
    key: "prohibited_claims",
    category: "safety",
    value:
      "- NEVER invent Arendora features, prices, customers, statistics or claims.\n" +
      "- No guarantee language ('guaranteed results', 'гарантия результата').\n" +
      "- No fabricated numbers: percentages of growth, user counts, revenue claims.\n" +
      "- If data is missing, write 'unknown' or omit it - never fabricate.\n" +
      "- Never copy third-party content verbatim.",
  },
  {
    key: "terminology",
    category: "voice",
    value:
      "- 'объект' (property), 'арендатор' (tenant), 'платёж' (payment), 'портфель' (portfolio), 'сводка' (summary)\n" +
      "- Product name: Arendora (capital A, one word)\n" +
      "- Avoid: 'CRM для риелторов', 'менеджер сдачи' and other invented category names",
  },
  {
    key: "cta_rules",
    category: "conversion",
    value:
      "- Every piece of content ends with a CTA.\n" +
      "- Standard CTA: 'Ведите объекты, арендаторов и платежи в Arendora → arendora.ru'\n" +
      "- CTA invites trying the product on arendora.ru; do not mention prices, trials or discounts (unknown).\n" +
      "- One CTA per piece. No multi-CTA stacking.",
  },
  {
    key: "visual_identity",
    category: "identity",
    value:
      "- Clean UI-first visuals: product screen recordings, dashboards, real data screens.\n" +
      "- No AI avatars. Voice-over + screen recording preferred.\n" +
      "- Brand color: blue (#3d69ec primary). White background, generous spacing.\n" +
      "- Captions on all short-form video (many viewers watch without sound).",
  },
  {
    key: "competitors",
    category: "market",
    value:
      "Competitor list: unknown. Do not name or compare specific competitors unless verified data is added to Product Knowledge.",
  },
  {
    key: "approved_messaging",
    category: "conversion",
    value:
      "- Pain: payments live in messenger screenshots; spreadsheets break after 3 properties; overdue payments noticed late; portfolio profitability is guesswork.\n" +
      "- Promise: objects, tenants, payments and portfolio performance in one place.\n" +
      "- Objection handling: moving to a system does not require a big migration project - start by adding current properties.",
  },
];

const PRODUCT_KNOWLEDGE = [
  {
    title: "Core scope: properties, tenants, payments, portfolio",
    category: "feature",
    body:
      "Arendora lets owners manage rental properties, tenants, payments and portfolio performance in one place. " +
      "These four areas are the verified core scope.",
    verified: true,
  },
  {
    title: "Target market",
    category: "feature",
    body: "Designed for landlords with 3-30 rental properties and small property managers (RU market, arendora.ru).",
    verified: true,
  },
  {
    title: "Pricing",
    category: "pricing",
    body: "unknown - pricing details are not confirmed; content must not mention specific prices, trials or discounts.",
    verified: false,
  },
  {
    title: "Feature list beyond core scope",
    category: "feature",
    body: "unknown - detailed feature inventory is not confirmed; content must stay within the verified core scope.",
    verified: false,
  },
];

async function main() {
  console.log("Seeding Arendora Content OS...");

  for (const rule of BRAND_RULES) {
    await prisma.brandRule.upsert({ where: { key: rule.key }, create: rule, update: { value: rule.value } });
  }
  console.log(`brand rules: ${BRAND_RULES.length}`);

  for (const k of PRODUCT_KNOWLEDGE) {
    const exists = await prisma.productKnowledge.findFirst({ where: { title: k.title } });
    if (!exists) await prisma.productKnowledge.create({ data: k });
  }

  for (const p of [
    { key: "tiktok", name: "TikTok" },
    { key: "instagram", name: "Instagram" },
    { key: "x", name: "X (Twitter)" },
    { key: "threads", name: "Threads" },
    { key: "seo", name: "SEO / Blog" },
  ]) {
    await prisma.platform.upsert({ where: { key: p.key }, create: p, update: {} });
  }

  const admin = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL ?? "admin@arendora.ru" } });
  if (!admin) {
    await prisma.user.create({
      data: {
        email: process.env.ADMIN_EMAIL ?? "admin@arendora.ru",
        passwordHash: hashPassword(process.env.ADMIN_PASSWORD ?? "ChangeMeNow2026"),
        role: "admin",
        name: "Arendora Admin",
      },
    });
    console.log("admin user created");
  }

  const campaignExists = await prisma.campaign.findFirst({ where: { name: "Arendora launch - evergreen" } });
  if (!campaignExists) {
    await prisma.campaign.create({
      data: {
        name: "Arendora launch - evergreen",
        goal: "registrations",
        notes: "Default always-on campaign targeting qualified registrations for arendora.ru.",
      },
    });
  }

  for (const k of [
    { phrase: "учёт аренды квартир", intent: "informational", cluster: "учёт аренды" },
    { phrase: "как вести учёт арендаторов", intent: "informational", cluster: "учёт аренды" },
    { phrase: "программа для учёта платежей арендаторов", intent: "commercial", cluster: "учёт платежей" },
    { phrase: "напоминание арендатору об оплате", intent: "informational", cluster: "платежи" },
    { phrase: "доходность арендного портфеля", intent: "informational", cluster: "аналитика" },
  ]) {
    const exists = await prisma.keyword.findFirst({ where: { phrase: k.phrase } });
    if (!exists) await prisma.keyword.create({ data: { ...k, source: "seed" } });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
