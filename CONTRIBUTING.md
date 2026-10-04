# Contributing

## Principles

1. **Never fabricate Arendora facts.** Any generated copy must pass the
   brand guard (`src/lib/brand.ts`). Unknown data stays "unknown".
2. **Platforms are different.** Each platform's content must have its own
   structure and voice - no copy-paste across platforms.
3. **Mock mode never lies.** Adapters without credentials must not report
   success. Publications without real API calls stay `mock`.
4. **All external I/O goes through adapters** in `src/lib/integrations/`,
   with timeouts and logged failures.

## Project layout

```
prisma/            schema (sqlite + postgres variants), seed
src/app/api/v1/    REST handlers (thin - validate + delegate)
src/app/dashboard/ UI pages (server components + client islands)
src/lib/agents/    one file per agent + registry
src/lib/llm/       provider (openai-compatible + builtin engine)
src/lib/integrations/ search, social/*, site analytics, telegram
src/lib/scheduler/ job queue + cron entry (src/scheduler/main.ts)
tests/             unit / integration / api / e2e
.zcode/            skills + commands for ZCode-assisted workflows
```

## Adding a new agent workflow

1. Implement the agent in `src/lib/agents/<name>.ts` with a `run...`
   function returning `{ ok, summary, logs }`.
2. Register it in `src/lib/agents/registry.ts` (`WORKFLOWS` map).
3. Optionally add a `JobDefinition` default in
   `src/lib/scheduler/queue.ts::ensureDefaultJobs` and re-seed.
4. Add unit/integration tests.

## Adding a new platform

1. Create an adapter in `src/lib/integrations/social/<platform>.ts`
   implementing `isConfigured()` and `publish()` returning `PublishResult`.
2. Register it in `src/lib/integrations/social/index.ts`.
3. Add the platform key to `PLATFORM_KEYS` in `src/lib/status.ts` and a
   variant kind/style guide in `agents/content.ts`.
4. Seed the platform row (`prisma/seed.ts`).

## Code style

- TypeScript strict; no `any` in new code (except Next route ctx plumbing).
- Zod-validate every external input at the API boundary.
- Server components fetch via Prisma directly; client components call the
  REST API only.

## Running tests before a PR

```bash
npm run typecheck
npm test
npm run build
```
