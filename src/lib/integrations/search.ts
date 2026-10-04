// Web/search provider adapter. Uses Tavily, Brave or Serper when an API key
// is configured (env or Settings UI); otherwise returns clearly-mocked
// placeholder results so the Research Agent can run offline.

import { resolveIntegration } from "../credentials";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 15_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`search provider error ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function tavily(query: string, max: number, apiKey: string): Promise<SearchResult[]> {
  const data = (await fetchJson("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, max_results: max }),
  })) as { results?: { title: string; url: string; content: string }[] };
  return (data.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.content.slice(0, 300) }));
}

async function brave(query: string, max: number, apiKey: string): Promise<SearchResult[]> {
  const data = (await fetchJson(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${max}`,
    { headers: { "X-Subscription-Token": apiKey, Accept: "application/json" } },
  )) as { web?: { results?: { title: string; url: string; description: string }[] } };
  return (data.web?.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.description }));
}

async function serper(query: string, max: number, apiKey: string): Promise<SearchResult[]> {
  const data = (await fetchJson("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: max }),
  })) as { organic?: { title: string; link: string; snippet: string }[] };
  return (data.organic ?? []).map((r) => ({ title: r.title, url: r.link, snippet: r.snippet }));
}

export async function search(query: string, max = 5): Promise<SearchResult[]> {
  const creds = await resolveIntegration("search");
  if (creds.tavilyApiKey) return tavily(query, max, creds.tavilyApiKey);
  if (creds.braveApiKey) return brave(query, max, creds.braveApiKey);
  if (creds.serperApiKey) return serper(query, max, creds.serperApiKey);
  // MOCK: no provider configured. Placeholder signals, clearly not real web data.
  return [
    {
      title: "[mock] property management content signal",
      url: "mock://local",
      snippet: `Mock search result for query: ${query}. Configure a search provider in Settings or via env for real web research.`,
    },
  ];
}
