// Integration credentials: write-only API. Values are encrypted with
// AES-256-GCM and stored in the DB; they are never returned to the frontend
// (GET only reports which fields are set, via /api/v1/settings).

import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { encryptJson, decryptJson } from "@/lib/secrets";
import { INTEGRATION_SPECS } from "@/lib/credentials";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  key: z.string().min(1).max(30),
  fields: z.record(z.string().max(8000)),
});

export const PUT = handler(async ({ req }) => {
  const { key, fields } = validate(putSchema, await parseBody(req));
  const spec = INTEGRATION_SPECS[key];
  if (!spec) throw new ApiError(400, `Unknown integration: ${key}`);

  // Whitelist field names; empty values are treated as "leave unchanged"
  // so the UI can submit partial forms without erasing stored secrets.
  const allowed = new Map(spec.fields.map((f) => [f.name, f]));
  const cleaned: Record<string, string> = {};
  for (const [name, value] of Object.entries(fields)) {
    if (!allowed.has(name)) continue;
    if (typeof value !== "string") continue;
    if (value.trim() === "") continue;
    cleaned[name] = value.trim();
  }

  // Merge with previously stored values so partial updates keep old secrets.
  let merged: Record<string, string> = {};
  const existingRow = await prisma.integrationCredential.findUnique({ where: { key } });
  if (existingRow) {
    try {
      merged = decryptJson(existingRow.data);
    } catch {
      merged = {};
    }
  }
  merged = { ...merged, ...cleaned };

  // Drop fields explicitly marked for removal: value === "\u0000CLEAR"
  for (const [name, value] of Object.entries(fields)) {
    if (value === "\u0000CLEAR") delete merged[name];
  }

  await prisma.integrationCredential.upsert({
    where: { key },
    create: { key, data: encryptJson(merged) },
    update: { data: encryptJson(merged) },
  });

  return json({ ok: true, key, setFields: Object.keys(merged) });
}, { rateLimit: 30 });

const deleteSchema = z.object({ key: z.string().min(1).max(30) });

export const DELETE = handler(async ({ req }) => {
  const url = new URL(req.url);
  const { key } = validate(deleteSchema, { key: url.searchParams.get("key") ?? "" });
  if (!INTEGRATION_SPECS[key]) throw new ApiError(400, `Unknown integration: ${key}`);
  await prisma.integrationCredential.deleteMany({ where: { key } });
  return json({ ok: true, key });
}, { rateLimit: 30 });
