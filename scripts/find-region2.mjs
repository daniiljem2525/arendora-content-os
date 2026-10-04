import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const password = readFileSync(".dbpassword.tmp", "utf8").trim();
const enc = encodeURIComponent(password);
const ref = "qitjfoxqpfnkuamhshit";
const envFile = readFileSync(".env", "utf8");
const regions = ["aws-0-eu-central-1","aws-1-eu-central-1","aws-0-eu-west-2","aws-1-eu-west-2","aws-0-eu-west-3","aws-1-eu-west-3","aws-0-eu-west-1","aws-1-eu-west-1","aws-0-eu-central-2","aws-1-eu-central-2"];
for (const r of regions) {
  const url = `postgresql://postgres.${ref}:${enc}@${r}.pooler.supabase.com:5432/postgres`;
  const newEnv = envFile.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${url}"`);
  writeFileSync(".env", newEnv);
  try {
    const out = execSync(`npx prisma db push --skip-generate`, { stdio: "pipe", timeout: 90000, encoding: "utf8" });
    console.log("WORKS:", r);
    process.exit(0);
  } catch (e) {
    const out = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
    const line = out.split("\n").filter(l => /error|Error|P1\d{3}|closed|reach/i.test(l)).slice(0, 2).join(" | ").slice(0, 200);
    console.log("fail:", r, "|", line);
  }
}
console.log("NO REGION WORKED");
