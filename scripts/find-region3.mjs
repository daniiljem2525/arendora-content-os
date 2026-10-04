import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const password = readFileSync(".dbpassword.tmp", "utf8").trim();
const enc = encodeURIComponent(password);
const ref = "qitjfoxqpfnkuamhshit";
const envFile = readFileSync(".env", "utf8");
const regions = ["aws-1-eu-central-1","aws-0-eu-west-2","aws-1-eu-west-2","aws-0-eu-west-3","aws-1-eu-west-3","aws-0-eu-west-1","aws-1-eu-west-1","aws-0-eu-central-2","aws-1-eu-central-2","aws-0-eu-north-1","aws-1-eu-north-1","aws-0-us-east-1","aws-1-us-east-1","aws-0-us-west-1","aws-1-us-west-1","aws-0-ap-southeast-1","aws-1-ap-southeast-1","aws-0-ap-northeast-1","aws-1-ap-northeast-1","aws-0-sa-east-1","aws-1-sa-east-1"];
for (const r of regions) {
  const url = `postgresql://postgres.${ref}:${enc}@${r}.pooler.supabase.com:5432/postgres`;
  writeFileSync(".env", envFile.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${url}"`));
  try {
    execSync(`npx prisma db push --skip-generate`, { stdio: "pipe", timeout: 90000, encoding: "utf8" });
    console.log("WORKS:", r);
    process.exit(0);
  } catch (e) {
    const out = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
    const m = out.match(/FATAL:.*/);
    console.log("fail:", r, "|", m ? m[0].slice(0, 140) : out.split("\n").filter(l=>/Error/i.test(l)).slice(-1)[0]?.slice(0, 140));
  }
}
console.log("NO REGION WORKED");
