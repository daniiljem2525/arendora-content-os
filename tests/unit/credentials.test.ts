import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { encryptJson, decryptJson } from "@/lib/secrets";
import { resolveIntegration, isComplete, INTEGRATION_SPECS } from "@/lib/credentials";
import { prisma } from "@/lib/db";

beforeAll(() => {
  execSync("npx prisma db push --skip-generate", { env: process.env, stdio: "pipe" });
});

describe("secrets encryption", () => {
  it("roundtrips credential JSON", () => {
    const data = { accessToken: "secret-token-1", accountId: "178904", password: "p@ss" };
    const enc = encryptJson(data);
    expect(enc).not.toContain("secret-token-1");
    expect(decryptJson(enc)).toEqual(data);
  });

  it("produces different ciphertexts for the same input", () => {
    expect(encryptJson({ a: "1" })).not.toBe(encryptJson({ a: "1" }));
  });
});

describe("credential resolution", () => {
  it("spec exists for every integration with valid fields", () => {
    for (const spec of Object.values(INTEGRATION_SPECS)) {
      expect(spec.fields.length).toBeGreaterThan(0);
      const names = spec.fields.map((f) => f.name);
      for (const req of spec.requiredForLive) expect(names).toContain(req);
    }
  });

  it("DB credentials override env defaults and are decrypted", async () => {
    await prisma.integrationCredential.upsert({
      where: { key: "telegram" },
      create: { key: "telegram", data: encryptJson({ botToken: "db-token-123", chatId: "555" }) },
      update: { data: encryptJson({ botToken: "db-token-123", chatId: "555" }) },
    });
    const resolved = await resolveIntegration("telegram");
    expect(resolved.botToken).toBe("db-token-123");
    expect(resolved.chatId).toBe("555");
    expect(isComplete("telegram", resolved)).toBe(true);

    await prisma.integrationCredential.deleteMany({ where: { key: "telegram" } });
    const after = await resolveIntegration("telegram");
    expect(isComplete("telegram", after)).toBe(false);
  });

  it("ignores unknown field names from the DB", async () => {
    await prisma.integrationCredential.upsert({
      where: { key: "tiktok" },
      create: { key: "tiktok", data: encryptJson({ accessToken: "tk-1", evilField: "x" }) },
      update: { data: encryptJson({ accessToken: "tk-1", evilField: "x" }) },
    });
    const resolved = await resolveIntegration("tiktok");
    expect(resolved.accessToken).toBe("tk-1");
    expect((resolved as Record<string, string>).evilField).toBeUndefined();
    await prisma.integrationCredential.deleteMany({ where: { key: "tiktok" } });
  });

  afterAll(async () => {
    await prisma.integrationCredential.deleteMany({ where: { key: { in: ["telegram", "tiktok"] } } });
  });
});
