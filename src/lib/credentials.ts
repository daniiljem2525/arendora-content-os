// Central credential resolution: DB-stored credentials (encrypted, entered
// via the Settings UI) take precedence over .env values. Adapters call
// resolveIntegration() and never read process.env directly for secrets.

import { prisma } from "./db";
import { decryptJson } from "./secrets";

export type CredentialField = "text" | "secret";

export interface CredentialFieldSpec {
  name: string;
  label: string;
  kind: CredentialField;
  required: boolean;
  hint?: string;
}

export interface IntegrationSpec {
  key: string;
  name: string;
  description: string;
  fields: CredentialFieldSpec[];
  /** Field names that must be non-empty for live mode. */
  requiredForLive: string[];
  docsUrl?: string;
}

export const INTEGRATION_SPECS: Record<string, IntegrationSpec> = {
  llm: {
    key: "llm",
    name: "LLM (OpenAI-совместимый)",
    description: "Генерация контента через внешнюю LLM. Без ключа работает встроенный движок.",
    fields: [
      { name: "apiKey", label: "API-ключ", kind: "secret", required: true },
      { name: "baseUrl", label: "Base URL", kind: "text", required: false, hint: "https://api.openai.com/v1" },
      { name: "model", label: "Модель", kind: "text", required: false, hint: "gpt-4o-mini" },
    ],
    requiredForLive: ["apiKey"],
  },
  search: {
    key: "search",
    name: "Веб-поиск (Tavily / Brave / Serper)",
    description: "Реальный веб-ресёрч для Research Agent. Без ключа используется встроенный пул инсайтов.",
    fields: [
      { name: "tavilyApiKey", label: "Tavily API-ключ", kind: "secret", required: false },
      { name: "braveApiKey", label: "Brave API-ключ", kind: "secret", required: false },
      { name: "serperApiKey", label: "Serper API-ключ", kind: "secret", required: false },
    ],
    requiredForLive: [],
  },
  instagram: {
    key: "instagram",
    name: "Instagram / Meta API",
    description:
      "Публикация Reels и каруселей. Нужен Instagram Business Account и токен через Meta for Developers (логин/пароль напрямую API не принимает).",
    fields: [
      { name: "accessToken", label: "Access token", kind: "secret", required: true },
      { name: "accountId", label: "Business account ID", kind: "text", required: true },
      { name: "login", label: "Логин (справочно)", kind: "text", required: false },
      { name: "password", label: "Пароль (справочно, API не использует)", kind: "secret", required: false },
    ],
    requiredForLive: ["accessToken", "accountId"],
    docsUrl: "https://developers.facebook.com/docs/instagram-platform",
  },
  threads: {
    key: "threads",
    name: "Threads API",
    description: "Публикация постов в Threads. Нужен токен из Meta for Developers.",
    fields: [
      { name: "accessToken", label: "Access token", kind: "secret", required: true },
      { name: "userId", label: "Threads user ID", kind: "text", required: true },
      { name: "login", label: "Логин (справочно)", kind: "text", required: false },
      { name: "password", label: "Пароль (справочно, API не использует)", kind: "secret", required: false },
    ],
    requiredForLive: ["accessToken", "userId"],
    docsUrl: "https://developers.facebook.com/docs/threads",
  },
  x: {
    key: "x",
    name: "X (Twitter) API",
    description: "Публикация постов и тредов. Все 4 ключа из developer.x.com (OAuth 1.0a, права Read and Write).",
    fields: [
      { name: "apiKey", label: "API Key (Consumer Key)", kind: "secret", required: true },
      { name: "apiSecret", label: "API Key Secret (Consumer Secret)", kind: "secret", required: true },
      { name: "accessToken", label: "Access Token", kind: "secret", required: true },
      { name: "accessTokenSecret", label: "Access Token Secret", kind: "secret", required: true },
      { name: "login", label: "Логин (справочно)", kind: "text", required: false },
      { name: "password", label: "Пароль (справочно, API не использует)", kind: "secret", required: false },
    ],
    requiredForLive: ["apiKey", "apiSecret", "accessToken", "accessTokenSecret"],
    docsUrl: "https://developer.x.com",
  },
  tiktok: {
    key: "tiktok",
    name: "TikTok API",
    description: "Публикация видео через Content Posting API. Нужен access token из TikTok for Developers.",
    fields: [
      { name: "accessToken", label: "Access token", kind: "secret", required: true },
      { name: "login", label: "Логин (справочно)", kind: "text", required: false },
      { name: "password", label: "Пароль (справочно, API не использует)", kind: "secret", required: false },
    ],
    requiredForLive: ["accessToken"],
    docsUrl: "https://developers.tiktok.com",
  },
  gsc: {
    key: "gsc",
    name: "Google Search Console",
    description: "Метрики поиска (показы, клики, CTR) для сайта arendora.ru.",
    fields: [
      { name: "accessToken", label: "OAuth access token", kind: "secret", required: true },
      { name: "propertyUrl", label: "Property URL", kind: "text", required: true, hint: "sc-domain:arendora.ru" },
    ],
    requiredForLive: ["accessToken", "propertyUrl"],
  },
  ga4: {
    key: "ga4",
    name: "Google Analytics 4",
    description: "Сессии и конверсии сайта через GA4 Data API (service account).",
    fields: [
      { name: "propertyId", label: "Property ID", kind: "text", required: true },
      { name: "clientEmail", label: "Client email (service account)", kind: "text", required: true },
      { name: "privateKey", label: "Private key", kind: "secret", required: true },
    ],
    requiredForLive: ["propertyId", "clientEmail", "privateKey"],
  },
  telegram: {
    key: "telegram",
    name: "Telegram уведомления",
    description: "Отчёты и алерты о сбоях задач в ваш чат.",
    fields: [
      { name: "botToken", label: "Bot token", kind: "secret", required: true, hint: "от @BotFather" },
      { name: "chatId", label: "Chat ID", kind: "text", required: true },
    ],
    requiredForLive: ["botToken", "chatId"],
  },
};

/** env-значения по умолчанию для каждого ключа интеграции. */
function envDefaults(key: string): Record<string, string> {
  const e = process.env;
  switch (key) {
    case "llm":
      return { apiKey: e.OPENAI_API_KEY ?? "", baseUrl: e.OPENAI_BASE_URL ?? "", model: e.OPENAI_MODEL ?? "" };
    case "search":
      return { tavilyApiKey: e.TAVILY_API_KEY ?? "", braveApiKey: e.BRAVE_API_KEY ?? "", serperApiKey: e.SERPER_API_KEY ?? "" };
    case "instagram":
      return { accessToken: e.INSTAGRAM_ACCESS_TOKEN ?? "", accountId: e.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "" };
    case "threads":
      return { accessToken: e.THREADS_ACCESS_TOKEN ?? "", userId: e.THREADS_USER_ID ?? "" };
    case "x":
      return {
        apiKey: e.X_API_KEY ?? "",
        apiSecret: e.X_API_SECRET ?? "",
        accessToken: e.X_ACCESS_TOKEN ?? "",
        accessTokenSecret: e.X_ACCESS_TOKEN_SECRET ?? "",
      };
    case "tiktok":
      return { accessToken: e.TIKTOK_ACCESS_TOKEN ?? "" };
    case "gsc":
      return { accessToken: e.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN ?? "", propertyUrl: e.GSC_PROPERTY_URL ?? "" };
    case "ga4":
      return { propertyId: e.GOOGLE_ANALYTICS_PROPERTY_ID ?? "", clientEmail: e.GA4_CLIENT_EMAIL ?? "", privateKey: e.GA4_PRIVATE_KEY ?? "" };
    case "telegram":
      return { botToken: e.TELEGRAM_BOT_TOKEN ?? "", chatId: e.TELEGRAM_CHAT_ID ?? "" };
    default:
      return {};
  }
}

/**
 * Resolve credentials for an integration: env defaults overlaid with the
 * encrypted DB record (DB wins). Only whitelisted field names are accepted.
 */
export async function resolveIntegration(key: string): Promise<Record<string, string>> {
  const spec = INTEGRATION_SPECS[key];
  if (!spec) throw new Error(`Unknown integration: ${key}`);
  const resolved = { ...envDefaults(key) };
  const row = await prisma.integrationCredential.findUnique({ where: { key } });
  if (row) {
    try {
      const stored = decryptJson(row.data);
      for (const field of spec.fields) {
        const v = stored[field.name];
        if (typeof v === "string" && v.length > 0) resolved[field.name] = v;
      }
    } catch (err) {
      console.error(`[credentials] failed to decrypt ${key}:`, err);
    }
  }
  return resolved;
}

export function isComplete(key: string, values: Record<string, string>): boolean {
  const spec = INTEGRATION_SPECS[key];
  if (!spec) return false;
  if (spec.requiredForLive.length === 0) {
    // any non-empty field counts (e.g. search providers)
    return Object.values(values).some((v) => v && v.length > 0);
  }
  return spec.requiredForLive.every((f) => values[f] && values[f].length > 0);
}

export async function isLive(key: string): Promise<boolean> {
  return isComplete(key, await resolveIntegration(key));
}

/** Status overview for the settings page (no secret values). */
export async function integrationsStatus() {
  const out: {
    key: string;
    name: string;
    description: string;
    live: boolean;
    source: "database" | "env" | "none";
    setFields: string[];
    docsUrl?: string;
  }[] = [];
  for (const spec of Object.values(INTEGRATION_SPECS)) {
    const values = await resolveIntegration(spec.key);
    const live = isComplete(spec.key, values);
    const dbRow = await prisma.integrationCredential.findUnique({ where: { key: spec.key } });
    let source: "database" | "env" | "none" = "none";
    if (dbRow) source = "database";
    else if (Object.values(envDefaults(spec.key)).some((v) => v && v.length > 0)) source = "env";
    const setFields = spec.fields.filter((f) => values[f.name]?.length).map((f) => f.name);
    out.push({
      key: spec.key,
      name: spec.name,
      description: spec.description,
      live,
      source,
      setFields,
      docsUrl: spec.docsUrl,
    });
  }
  return out;
}
