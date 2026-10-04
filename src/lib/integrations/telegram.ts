// Telegram notification adapter (Bot API). Used for job failure alerts and
// weekly reports. Silently no-ops when not configured (logs the message).

import { isComplete, resolveIntegration } from "../credentials";

export async function sendTelegramMessage(
  text: string,
): Promise<{ ok: boolean; mode: "live" | "mock"; error?: string }> {
  const creds = await resolveIntegration("telegram");
  if (!isComplete("telegram", creds)) {
    console.log(`[telegram:mock] ${text}`);
    return { ok: false, mode: "mock", error: "Telegram не настроен (нужны bot token и chat ID в Настройках)" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${creds.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: creds.chatId, text: text.slice(0, 4000) }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Telegram API error ${res.status}`);
    return { ok: true, mode: "live" };
  } catch (err) {
    return { ok: false, mode: "live", error: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}
