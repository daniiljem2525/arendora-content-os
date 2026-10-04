import { execSync } from "node:child_process";

export default function setup() {
  // Fresh database for every test run.
  for (const f of ["prisma/test.db", "prisma/test.db-journal", "test.db", "test.db-journal"]) {
    try {
      execSync(`rm -f "${f}"`);
    } catch {
      /* ignore */
    }
  }
}
