// End-to-end test for the main content workflow against a RUNNING server.
// Usage:
//   1. npm run dev          (or npm start, or docker compose up)
//   2. npm run db:seed      (creates the admin user)
//   3. npm run test:e2e

import "dotenv/config";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@arendora.ru";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMeNow2026";

let cookie = "";

function fail(step: string, detail: unknown) {
  console.error(`✗ ${step}`);
  console.error(detail);
  process.exit(1);
}

async function call(path: string, init: RequestInit = {}, expectStatus = 200) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
  });
  if (res.headers.get("set-cookie")?.includes("arendora_session=")) {
    cookie = res.headers.get("set-cookie")!.split(";")[0];
  }
  if (res.status !== expectStatus) {
    fail(path, `expected ${expectStatus}, got ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json().catch(() => ({}));
}

async function main() {
  console.log(`E2E against ${BASE}`);

  // 1. Health
  const health = await call("/api/v1/health");
  console.log(`✓ health (db=${health.db}, llm=${health.llm})`);

  // 2. Login
  await call("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  console.log("✓ login");

  // 3. Research
  const research = await call("/api/v1/research", { method: "POST", body: JSON.stringify({ perType: 1, useWeb: false }) }, 201);
  console.log(`✓ research: ${research.created.length} items`);

  // 4. Ideas
  const ideas = await call("/api/v1/agents", { method: "POST", body: JSON.stringify({ workflow: "daily_ideas", payload: { count: 3 } }) });
  console.log(`✓ ideas generated: ${ideas.summary.created}`);

  // 5. Strategy
  const strategy = await call("/api/v1/strategy", { method: "POST", body: JSON.stringify({}) }, 201);
  console.log(`✓ strategy selected: ${strategy.selected.length}`);

  // 6. Content production for first selected idea
  const selectedIdea = strategy.selected[0];
  const content = await call("/api/v1/content", { method: "POST", body: JSON.stringify({ ideaId: selectedIdea.id }) }, 201);
  console.log(`✓ content produced: item ${content.contentItemId}, ${content.variants.length} variants`);

  // 7. Approve
  await call("/api/v1/approvals", {
    method: "POST",
    body: JSON.stringify({ contentItemId: content.contentItemId, decision: "approve" }),
  });
  console.log("✓ approved");

  // 8. Publish (mock mode expected without API keys)
  const detail = await call(`/api/v1/content/${content.contentItemId}`);
  const publishable = detail.item.variants.filter((v: { platform: string; status: string }) => v.platform !== "seo");
  const pub = await call("/api/v1/publications", {
    method: "POST",
    body: JSON.stringify({ variantId: publishable[0].id }),
  }, 201);
  console.log(`✓ publication status: ${pub.status} (mode=${pub.mode}) - mock is expected without API credentials`);

  // 9. Analytics
  const analytics = await call("/api/v1/analytics?days=30");
  console.log(`✓ analytics summary: impressions=${analytics.summary.impressions}, registrations=${analytics.summary.registrations}`);

  console.log("\nE2E workflow completed successfully.");
  process.exit(0);
}

main().catch((err) => {
  fail("unexpected error", err);
});
