import "dotenv/config";
import { runResearchAgent } from "../src/lib/agents/research";
import { runStrategyAgent } from "../src/lib/agents/strategy";
import { runWorkflow } from "../src/lib/scheduler/queue";
import { prisma } from "../src/lib/db";

async function main() {
  const r = await runResearchAgent({ perType: 1, useWeb: false });
  console.log("research created:", r.created.length);
  const ideas = await runWorkflow("daily_ideas", { count: 4 });
  console.log("ideas:", JSON.stringify(ideas.summary));
  const strat = await runStrategyAgent({ weekCount: 2 });
  console.log("strategy selected:", strat.selected.length);
  const prod = await runWorkflow("content_production", {});
  console.log("production:", JSON.stringify(prod.summary));
  const items = await prisma.contentItem.findMany({ include: { variants: true } });
  for (const it of items) {
    console.log(`item ${it.id} status=${it.status}`);
    for (const v of it.variants) console.log(`  ${v.kind} v${v.version} status=${v.status} qa=${v.qaScore}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
