import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const password = readFileSync(".dbpassword.tmp", "utf8").trim();
const enc = encodeURIComponent(password);
const ref = "qitjfoxqpfnkuamhshit";
const regions = ["aws-0-eu-central-1","aws-1-eu-central-1","aws-0-eu-west-2","aws-1-eu-west-2","aws-0-eu-west-3","aws-1-eu-west-3","aws-0-eu-west-1","aws-1-eu-west-1","aws-0-eu-central-2","aws-1-eu-central-2"];
for (const r of regions) {
  const url = `postgresql://postgres.${ref}:${enc}@${r}.pooler.supabase.com:5432/postgres`;
  try {
    execSync(`npx prisma db push --skip-generate`, { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe", timeout: 60000 });
    console.log("WORKS:", r);
    process.exit(0);
  } catch (e) {
    const out = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
    console.log("fail:", r, "|", out.split("\n").filter(l => /error|Error|P1\d{3}/.test(l)).slice(0,1).join("").slice(0, 120));
  }
}
console.log("NO REGION WORKED");
