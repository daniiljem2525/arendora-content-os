import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const publications = await prisma.publication.findMany({ orderBy: { createdAt: "asc" } });
  const byVariant = new Map<string, typeof publications>();
  for (const p of publications) {
    const list = byVariant.get(p.variantId) ?? [];
    list.push(p);
    byVariant.set(p.variantId, list);
  }
  let kept = 0;
  let removed = 0;
  for (const list of byVariant.values()) {
    // Prefer the earliest successful/mock publication; otherwise keep only the latest failed attempt.
    const ok = list.filter((p) => p.status === "published" || p.status === "mock");
    const keep = ok[0] ?? list[list.length - 1];
    kept++;
    for (const p of list) {
      if (p.id !== keep.id) {
        await prisma.publication.delete({ where: { id: p.id } });
        removed++;
      }
    }
  }
  console.log(`kept ${kept}, removed duplicates: ${removed}`);
  await prisma.$disconnect();
}
main();
