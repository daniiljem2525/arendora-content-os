import "dotenv/config";
import { prisma } from "../src/lib/db";
async function main() {
  const t = Date.now();
  const users = await prisma.user.count();
  console.log(`connected, User rows: ${users} (${Date.now() - t}ms)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("FAIL:", e.message.slice(0, 200)); process.exit(1); });
