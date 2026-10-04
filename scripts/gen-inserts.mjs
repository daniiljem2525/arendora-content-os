import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("data-export.json", "utf8"));
const q = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const row = (cols, r) => `(${cols.map((c) => q(r[c])).join(", ")})`;

const TABLES = [
  ["users", "User", ["id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt"]],
  ["platforms", "Platform", ["id", "key", "name", "enabled"]],
  ["campaigns", "Campaign", ["id", "name", "goal", "status", "startDate", "endDate", "notes", "createdAt"]],
  ["brandRules", "BrandRule", ["id", "key", "category", "value", "updatedAt"]],
  ["productKnowledge", "ProductKnowledge", ["id", "title", "category", "body", "source", "verified", "createdAt"]],
  ["researchItems", "ResearchItem", ["id", "source", "type", "title", "summary", "evidence", "sourceUrl", "score", "status", "createdAt"]],
  ["keywords", "Keyword", ["id", "phrase", "intent", "cluster", "volume", "difficulty", "source", "status", "createdAt"]],
  ["ideas", "Idea", ["id", "title", "angle", "researchItemId", "campaignId", "virality", "relevance", "differentiation", "conversion", "totalScore", "status", "rationale", "createdAt"]],
  ["contentItems", "ContentItem", ["id", "ideaId", "campaignId", "title", "primaryPlatform", "status", "scheduledAt", "createdAt", "updatedAt"]],
  ["contentVariants", "ContentVariant", ["id", "contentItemId", "platform", "kind", "payload", "status", "qaScore", "qaReport", "version", "createdAt", "updatedAt"]],
  ["publications", "Publication", ["id", "variantId", "platform", "mode", "status", "externalId", "externalUrl", "error", "publishedAt", "createdAt"]],
  ["seoArticles", "SeoArticle", ["id", "keywordId", "contentItemId", "title", "metaDescription", "h1", "outline", "body", "internalLinks", "faqSchema", "cta", "status", "createdAt", "updatedAt"]],
  ["analyticsRecords", "AnalyticsRecord", ["id", "publicationId", "platform", "date", "impressions", "views", "likes", "comments", "shares", "saves", "clicks", "ctr", "profileVisits", "websiteVisits", "registrations", "activatedUsers", "conversions", "isMock", "createdAt"]],
  ["experiments", "Experiment", ["id", "name", "hypothesis", "kind", "variants", "status", "startDate", "endDate", "result", "createdAt"]],
  ["learningInsights", "LearningInsight", ["id", "kind", "finding", "evidence", "confidence", "createdAt"]],
  ["strategyPlans", "StrategyPlan", ["id", "weekStart", "notes", "ideaIds", "status", "createdAt"]],
  ["jobDefinitions", "JobDefinition", ["id", "key", "name", "cron", "workflow", "enabled"]],
  ["jobRuns", "JobRun", ["id", "workflow", "trigger", "status", "logs", "error", "startedAt", "finishedAt"]],
  ["integrationCredentials", "IntegrationCredential", ["id", "key", "data", "updatedAt"]],
  ["appSettings", "AppSetting", ["id", "key", "value", "updatedAt"]],
];

let sql = "-- Arendora Content OS data migration\nBEGIN;\nSET session_replication_role = replica;\n";
for (const [key, table, cols] of TABLES) {
  const rows = data[key] ?? [];
  if (rows.length === 0) continue;
  // chunk to keep statements reasonable
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50).map((r) => row(cols, r)).join(",\n");
    sql += `\nINSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES\n${chunk} ON CONFLICT (id) DO NOTHING;\n`;
  }
}
sql += "\nCOMMIT;\n";
writeFileSync("data-inserts.sql", sql);
console.log("inserts written:", sql.length, "chars");
