import "dotenv/config";
import { prisma } from "../src/lib/db";
async function main() {
  const r = await prisma.contentItem.updateMany({ where: { status: "failed" }, data: { status: "approved" } });
  console.log("items restored to approved:", r.count);
  await prisma.$disconnect();
}
main();
