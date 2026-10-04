// Switches prisma/schema.prisma between the SQLite (default) and PostgreSQL
// variants. Usage:
//   node scripts/switch-postgres.mjs apply    # switch to PostgreSQL
//   node scripts/switch-postgres.mjs revert   # switch back to SQLite
import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(process.cwd());
const active = path.join(root, "prisma", "schema.prisma");
const pg = path.join(root, "prisma", "schema.postgres.prisma");
const backup = path.join(root, "prisma", "schema.sqlite.prisma.bak");

const mode = process.argv[2] ?? "apply";

if (mode === "apply") {
  if (!existsSync(pg)) {
    console.error("schema.postgres.prisma not found");
    process.exit(1);
  }
  copyFileSync(active, backup);
  copyFileSync(pg, active);
  console.log("Switched to PostgreSQL schema. Run: npx prisma db push && npx prisma generate");
} else if (mode === "revert") {
  if (!existsSync(backup)) {
    console.error("No SQLite schema backup found");
    process.exit(1);
  }
  copyFileSync(backup, active);
  unlinkSync(backup);
  console.log("Switched back to SQLite schema. Run: npx prisma db push && npx prisma generate");
} else {
  console.error("Unknown mode:", mode);
  process.exit(1);
}
