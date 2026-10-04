// Agent base: shared context (logging, brand, learning insights) and helpers.

import { prisma } from "../db";
import { loadBrandContext, type BrandContext } from "../brand";
import { generateJson, llmMode, type GenerateOptions, type LlmMessage } from "../llm/provider";
import type { MockTask, MockContext } from "../llm/mock-generators";

export interface AgentLogger {
  log(line: string): void;
  lines(): string[];
}

export function createLogger(): AgentLogger {
  const buf: string[] = [];
  return {
    log(line: string) {
      const stamped = `[${new Date().toISOString()}] ${line}`;
      buf.push(stamped);
      console.log(stamped);
    },
    lines: () => [...buf],
  };
}

export interface AgentContext {
  logger: AgentLogger;
  brand: BrandContext;
}

export async function createAgentContext(logger: AgentLogger): Promise<AgentContext> {
  const brand = await loadBrandContext();
  return { logger, brand };
}

/** Build prompts and run generation through the configured LLM provider. */
export async function agentGenerate<T>(
  ctx: AgentContext,
  task: MockTask,
  context: MockContext,
  instructions: string,
  userBrief: string,
): Promise<{ data: T; mode: "live" | "builtin" }> {
  const messages: LlmMessage[] = [
    {
      role: "system",
      content: `${instructions}\n\n${ctx.brand.compiled}\n\nAlways answer with a single valid JSON object, no prose.`,
    },
    { role: "user", content: userBrief },
  ];
  const options: GenerateOptions = { task, context };
  const result = await generateJson<T>(messages, options);
  ctx.logger.log(`generation: task=${task} mode=${result.mode}`);
  return { data: result.data, mode: result.mode };
}

export async function currentLlmMode(): Promise<string> {
  return llmMode();
}

/** Flatten any generated payload into plain text (for QA checks). */
export function payloadToText(payload: unknown): string {
  const out: string[] = [];
  const walk = (v: unknown, depth = 0) => {
    if (depth > 6) return;
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (v && typeof v === "object") Object.values(v).forEach((x) => walk(x, depth + 1));
  };
  walk(payload);
  return out.join("\n");
}

/** Week start (Monday) ISO date for strategy plans. */
export function weekStartISO(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

export { prisma };
