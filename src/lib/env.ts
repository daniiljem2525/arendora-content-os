// Central environment access. Secrets are read server-side only and never
// sent to the frontend; the settings page only reports which integrations
// are configured, not their values.

function str(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

function bool(key: string, fallback = false): boolean {
  const v = (process.env[key] ?? "").toLowerCase();
  if (!v) return fallback;
  return v === "true" || v === "1" || v === "yes";
}

export const env = {
  get databaseUrl() {
    return str("DATABASE_URL", "file:./dev.db");
  },
  get authSecret() {
    return str("AUTH_SECRET");
  },
  get adminEmail() {
    return str("ADMIN_EMAIL", "admin@arendora.ru");
  },
  get adminPassword() {
    return str("ADMIN_PASSWORD", "ChangeMeNow2026");
  },
  // LLM
  get openaiApiKey() {
    return str("OPENAI_API_KEY");
  },
  get openaiBaseUrl() {
    return str("OPENAI_BASE_URL", "https://api.openai.com/v1");
  },
  get openaiModel() {
    return str("OPENAI_MODEL", "gpt-4o-mini");
  },
  // Search
  get tavilyApiKey() {
    return str("TAVILY_API_KEY");
  },
  get braveApiKey() {
    return str("BRAVE_API_KEY");
  },
  get serperApiKey() {
    return str("SERPER_API_KEY");
  },
  // Social
  get instagramToken() {
    return str("INSTAGRAM_ACCESS_TOKEN");
  },
  get instagramAccountId() {
    return str("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  },
  get metaGraphVersion() {
    return str("META_GRAPH_VERSION", "v21.0");
  },
  get threadsToken() {
    return str("THREADS_ACCESS_TOKEN");
  },
  get threadsUserId() {
    return str("THREADS_USER_ID");
  },
  get xApiKey() {
    return str("X_API_KEY");
  },
  get xApiSecret() {
    return str("X_API_SECRET");
  },
  get xAccessToken() {
    return str("X_ACCESS_TOKEN");
  },
  get xAccessTokenSecret() {
    return str("X_ACCESS_TOKEN_SECRET");
  },
  get tiktokToken() {
    return str("TIKTOK_ACCESS_TOKEN");
  },
  // Analytics
  get gscToken() {
    return str("GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN");
  },
  get gscProperty() {
    return str("GSC_PROPERTY_URL");
  },
  get ga4PropertyId() {
    return str("GOOGLE_ANALYTICS_PROPERTY_ID");
  },
  get ga4ClientEmail() {
    return str("GA4_CLIENT_EMAIL");
  },
  get ga4PrivateKey() {
    return str("GA4_PRIVATE_KEY");
  },
  // Telegram
  get telegramBotToken() {
    return str("TELEGRAM_BOT_TOKEN");
  },
  get telegramChatId() {
    return str("TELEGRAM_CHAT_ID");
  },
  // Flags
  get analyticsMockData() {
    return bool("ANALYTICS_MOCK_DATA", false);
  },
  get mockLlm() {
    return bool("MOCK_LLM", false);
  },
};

// NOTE: integration configuration is resolved centrally in credentials.ts
// (DB-stored encrypted credentials take precedence over env values).
