// API tests: exercise route handlers directly (auth, validation, business
// endpoints) against the test database.

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken } from "@/lib/auth";
import { resetRateLimits } from "@/lib/rate-limit";

import { GET as healthGET } from "@/app/api/v1/health/route";
import { POST as loginPOST } from "@/app/api/v1/auth/login/route";
import { GET as ideasGET, POST as ideasPOST, PATCH as ideasPATCH } from "@/app/api/v1/ideas/route";
import { POST as campaignsPOST } from "@/app/api/v1/campaigns/route";
import { POST as agentsPOST } from "@/app/api/v1/agents/route";
import { GET as approvalsGET } from "@/app/api/v1/approvals/route";

let cookie = "";
let userId = "";

function req(path: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost:3000${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
  });
}

beforeAll(async () => {
  execSync("npx prisma db push --skip-generate", { env: process.env, stdio: "pipe" });
  resetRateLimits();
  const email = "admin@test.local";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, passwordHash: hashPassword("TestPassword123"), role: "admin" },
    });
  }
  userId = user.id;
  const token = await createSessionToken({ sub: user.id, email, role: user.role });
  cookie = `arendora_session=${token}`;
});

describe("API", () => {
  it("health is public and reports db status", async () => {
    const res = await healthGET(req("/api/v1/health"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.db).toBe(true);
  });

  it("protected endpoints reject unauthenticated requests", async () => {
    const saved = cookie;
    cookie = "";
    const res = await ideasGET(req("/api/v1/ideas"), { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
    cookie = saved;
  });

  it("login rejects wrong password and accepts correct one", async () => {
    const bad = await loginPOST(
      req("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@test.local", password: "wrong" }) }),
      { params: Promise.resolve({}) },
    );
    expect(bad.status).toBe(401);

    const ok = await loginPOST(
      req("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@test.local", password: "TestPassword123" }) }),
      { params: Promise.resolve({}) },
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toContain("arendora_session=");
  });

  it("validation errors return 400", async () => {
    const res = await loginPOST(
      req("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email: "not-an-email", password: "" }) }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
  });

  it("ideas CRUD works end to end", async () => {
    const created = await ideasPOST(
      req("/api/v1/ideas", { method: "POST", body: JSON.stringify({ title: "Test idea: учёт платежей по объектам", angle: "pain mirror" }) }),
      { params: Promise.resolve({}) },
    );
    expect(created.status).toBe(201);
    const { idea } = await created.json();

    const list = await ideasGET(req("/api/v1/ideas"), { params: Promise.resolve({}) });
    const { items } = await list.json();
    expect(items.some((i: { id: string }) => i.id === idea.id)).toBe(true);

    const patched = await ideasPATCH(
      req(`/api/v1/ideas?id=${idea.id}`, { method: "PATCH", body: JSON.stringify({ status: "selected" }) }),
      { params: Promise.resolve({}) },
    );
    expect(patched.status).toBe(200);
    expect(userId).toBeTruthy();
  });

  it("campaigns can be created", async () => {
    const res = await campaignsPOST(
      req("/api/v1/campaigns", { method: "POST", body: JSON.stringify({ name: "API test campaign", goal: "registrations" }) }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(201);
  });

  it("unknown workflow is rejected with 400", async () => {
    const res = await agentsPOST(
      req("/api/v1/agents", { method: "POST", body: JSON.stringify({ workflow: "does_not_exist" }) }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
  });

  it("approval queue is reachable and shaped correctly", async () => {
    const res = await approvalsGET(req("/api/v1/approvals"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
    expect(Array.isArray(data.seoArticles)).toBe(true);
  });

  it("rate limiting returns 429 when hammered", async () => {
    resetRateLimits();
    let lastStatus = 200;
    for (let i = 0; i < 130; i++) {
      lastStatus = (await healthGET(req("/api/v1/health"), { params: Promise.resolve({}) })).status;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
    resetRateLimits();
  });
});
