// Encryption for integration credentials stored in the database.
// AES-256-GCM with a key derived from AUTH_SECRET (scrypt). Values are
// write-only from the UI: never returned to the frontend.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to at least 16 characters");
  }
  cachedKey = scryptSync(secret, "arendora-content-os-credentials", 32);
  return cachedKey;
}

export function encryptJson(data: Record<string, string>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptJson(payload: string): Record<string, string> {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as Record<string, string>;
}
