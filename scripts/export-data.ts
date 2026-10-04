import "dotenv/config";
import { prisma } from "../src/lib/db";
import { writeFileSync } from "node:fs";

async function main() {
  const data = {
    users: await prisma.user.findMany(),
    platforms: await prisma.platform.findMany(),
    campaigns: await prisma.campaign.findMany(),
    researchItems: await prisma.researchItem.findMany(),
    ideas: await prisma.idea.findMany(),
    contentItems: await prisma.contentItem.findMany(),
    contentVariants: await prisma.contentVariant.findMany(),
    publications: await prisma.publication.findMany(),
    analyticsRecords: await prisma.analyticsRecord.findMany(),
    experiments: await prisma.experiment.findMany(),
    brandRules: await prisma.brandRule.findMany(),
    productKnowledge: await prisma.productKnowledge.findMany(),
    keywords: await prisma.keyword.findMany(),
    seoArticles: await prisma.seoArticle.findMany(),
    learningInsights: await prisma.learningInsight.findMany(),
    strategyPlans: await prisma.strategyPlan.findMany(),
    jobDefinitions: await prisma.jobDefinition.findMany(),
    jobRuns: await prisma.jobRun.findMany(),
    integrationCredentials: await prisma.integrationCredential.findMany(),
    appSettings: await prisma.appSetting.findMany(),
  };
  writeFileSync("data-export.json", JSON.stringify(data));
  console.log("exported:", Object.entries(data).map(([k, v]) => `${k}=${v.length}`).join(", "));
  await prisma.$disconnect();
}
main();
