// App-level settings (small key-value flags like auto_publish).

import { prisma } from "./db";

export async function getAppSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function isAutoPublishEnabled(): Promise<boolean> {
  return (await getAppSetting("auto_publish")) === "true";
}
