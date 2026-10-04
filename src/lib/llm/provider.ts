// LLM abstraction. Two providers:
//  - OpenAiCompatibleProvider: any OpenAI-compatible chat completions API.
//  - BuiltinProvider (builtin mode): deterministic generation engine built
//    into the platform. Default when no API key is configured (env or DB).
//
// Agents always call generateJson() and never care which provider ran.

import { env } from "../env";
import { isLive, resolveIntegration } from "../credentials";
import { runMockGenerator, type MockTask, type MockContext } from "./mock-generators";
import { extractJson } from "./json";

export interface LlmMessage {
  role: "system" | "user";
  content: string;
}

export interface GenerateOptions {
  /** Machine-readable task name driving the builtin generator. */
  task: MockTask;
  /** Structured context for the builtin generator (and prompt variables). */
  context: MockContext;
  temperature?: number;
}

export interface GenerateResult<T> {
  data: T;
  mode: "live" | "builtin";
  model: string;
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
}

async function callOpenAiCompatible(
  messages: LlmMessage[],
  temperature: number,
  creds: { apiKey: string; baseUrl: string; model: string },
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`${creds.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiKey}`,
      },
      body: JSON.stringify({
        model: creds.model,
        messages,
        temperature,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`LLM API error ${res.status}: ${body.slice(0, 500)}`);
    }
    const json = (await res.json()) as OpenAiChatResponse;
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error("LLM API returned no content");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate structured JSON via the configured provider.
 * Falls back to the builtin generator if the live call fails and the
 * fallback is allowed (keeps workflows running without credentials).
 */
export async function generateJson<T>(
  messages: LlmMessage[],
  options: GenerateOptions,
  opts: { allowFallback?: boolean } = {},
): Promise<GenerateResult<T>> {
  const { allowFallback = true } = opts;

  if (!env.mockLlm && (await isLive("llm"))) {
    const creds = await resolveIntegration("llm");
    try {
      const text = await callOpenAiCompatible(messages, options.temperature ?? 0.7, {
        apiKey: creds.apiKey,
        baseUrl: creds.baseUrl || env.openaiBaseUrl,
        model: creds.model || env.openaiModel,
      });
      return { data: JSON.parse(extractJson(text)) as T, mode: "live", model: creds.model || env.openaiModel };
    } catch (err) {
      console.error("[llm] live call failed:", err);
      if (!allowFallback) throw err;
    }
  }

  return {
    data: runMockGenerator(options.task, options.context) as T,
    mode: "builtin",
    model: "arendora-builtin-engine",
  };
}

export async function llmMode(): Promise<"live" | "builtin"> {
  return !env.mockLlm && (await isLive("llm")) ? "live" : "builtin";
}
