# Architecture

## Overview

Arendora Content OS is a single Next.js application (App Router, TypeScript)
with a modular service layer, Prisma ORM, a DB-backed job queue and a
separate cron scheduler process.

```
┌──────────────────────────────────────────────────────────────┐
│ Dashboard (React Server Components + client islands)         │
│ /dashboard/*  -  login  -  middleware (JWT cookie auth)       │
├──────────────────────────────────────────────────────────────┤
│ REST API  /api/v1/*  (thin handlers: auth + zod + rate limit)│
├──────────────────────────────────────────────────────────────┤
│ Service layer                                                │
│  agents/     research | strategy | content | video | seo |   │
│              qa | analytics | learning | registry            │
│  scheduler/  queue.ts (JobRun) + cron scheduler process      │
│  integrations/ llm | search | social/* | site | telegram     │
│  brand.ts (knowledge base + brand guard)   auth.ts  env.ts   │
├──────────────────────────────────────────────────────────────┤
│ Prisma  ─ SQLite (dev default)  /  PostgreSQL (production)   │
└──────────────────────────────────────────────────────────────┘
```

## Data model (prisma/schema.prisma)

Core entities: `ResearchItem`, `Idea`, `ContentItem`, `ContentVariant`,
`Publication`, `AnalyticsRecord`, `Campaign`, `Platform`, `Keyword`,
`SeoArticle`, `Experiment`, `BrandRule`, `ProductKnowledge`,
`LearningInsight`, `StrategyPlan`, plus `User`, `JobDefinition`, `JobRun`.

Statuses are validated strings (SQLite does not support Prisma enums) -
single source of truth in `src/lib/status.ts`:

- Content item / variant: `draft → ai_review → awaiting_approval → approved → published | failed | archived`
- Publication: `pending | published | failed | mock`
- Idea: `new | selected | rejected | produced`

## Generation pipeline

1. **Research Agent** (`agents/research.ts`) - collects pain points, trends,
   competitor topics, SEO opportunities and audience questions. Uses the
   search adapter for evidence when configured; stores original summaries
   (never third-party text verbatim) in `ResearchItem`.
2. **Idea generation** (workflow `daily_ideas`) - turns fresh research into
   `Idea` rows linked to their research item.
3. **Strategy Agent** (`agents/strategy.ts`) - scores every new idea on
   virality / relevance / differentiation / conversion (transparent
   heuristics, conversion-weighted, matching the business goal), selects the
   weekly set, persists a `StrategyPlan`.
4. **Content Agent** (`agents/content.ts`) - per selected idea creates a
   `ContentItem` with six platform variants (TikTok script, IG Reel,
   IG carousel, X thread, Threads post, SEO brief). Each platform has its own
   style guide and payload shape.
5. **Video Agent** (`agents/video.ts`) - packages the short-form script into
   a production package: hook, scenes, voiceover, visual instructions
   (screen recordings, no AI avatars), captions, CTA, title, thumbnail.
6. **SEO Agent** (`agents/seo.ts`) - keyword research (`Keyword`, volume
   unknown unless real data exists) and full articles (`SeoArticle`):
   intent, cluster, title, meta, H1, outline, body, internal links, FAQ
   schema, CTA.
7. **QA Agent** (`agents/qa.ts`) - checks hook strength, clarity, brand
   safety (via `brandGuard`), CTA quality, platform limits (280/500 chars...),
   originality (trigram similarity on distinctive fingerprints). Duplication
   and brand violations are hard-rejects; a rejected variant is regenerated
   once automatically.
8. **Approval** - humans approve/reject per item or per variant via the
   dashboard or API.
9. **Publishing** - `integrations/social/*` adapters (Instagram, Threads, X,
   TikTok). Without credentials the publication stays in status `mock`;
   failures are recorded as `failed` with the provider error. Never faked.
10. **Analytics Agent** (`agents/analytics.ts`) - pulls insights from live
    integrations; with `ANALYTICS_MOCK_DATA=true` stores clearly-labeled
    (`isMock`) demo metrics for local development. Site metrics come from
    GSC/GA4 adapters.
11. **Learning Agent** (`agents/learning.ts`) - computes business impact
    (registrations/activations/conversions weighted over vanity metrics) and
    writes `LearningInsight` records: winning hooks, topics, formats, CTAs,
    posting times. Top insights are injected into future generation prompts.

## LLM abstraction (`src/lib/llm/provider.ts`)

`generateJson(task, context, messages)` dispatches to:

- **Live mode**: any OpenAI-compatible chat-completions endpoint
  (`OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, JSON response format).
- **Builtin mode** (default): `mock-generators.ts` - a deterministic template
  engine with per-platform style rules and the brand-safe copy rules baked in.

Agents never know which mode ran; the mode is logged and shown in the UI.

## Scheduling

- `JobDefinition` rows (seeded defaults) map cron expressions to workflows.
- `npm run scheduler` runs `node-cron` in its own process; every execution is
  a `JobRun` row with logs and error output.
- Any workflow can be triggered manually via `POST /api/v1/agents`
  or the AI Agents dashboard page.
- `publish_scheduled` publishes approved content whose scheduled time has
  arrived.

## Security

- JWT session cookies (jose, HS256, httpOnly, 7 days), scrypt password
  hashing - no native deps.
- All API routes go through `handler()` (auth + Zod validation + rate
  limiting + structured errors).
- Secrets only via `.env`; the settings endpoint reports configured/not
  configured, never values.
- External API calls are isolated inside adapters with timeouts; generated
  content is never executed, only stored/displayed.
- Failures are logged to `JobRun` and pushed to Telegram when configured.

## Testing

- `tests/unit/core.test.ts` - brand guard, QA checks, similarity, JSON
  extraction, rate limiter, scoring, builtin generator platform
  distinctiveness.
- `tests/integration/pipeline.test.ts` - the full pipeline on an isolated
  test database (research → ideas → strategy → content → QA → video →
  approval → mock publication → analytics → learning → SEO).
- `tests/integration/api.test.ts` - route handlers: auth, validation, CRUD,
  rate limiting.
- `tests/e2e/workflow.ts` - end-to-end against a running server.
