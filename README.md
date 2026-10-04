# Arendora Content OS

AI marketing automation platform for **Arendora** (arendora.ru) - a property
management SaaS for landlords with 3-30 rental properties.

One research insight becomes a full multi-platform content package:
TikTok script, Instagram Reel, Instagram carousel, X thread, Threads post and
an SEO article - scored, QA-checked, approval-gated, scheduled, published and
measured through the full funnel down to registrations and conversions.

## Highlights

- **8 modular AI agents**: Research, Strategy, Content, Video, SEO, QA,
  Analytics, Learning - each a standalone service, orchestrated via a
  DB-backed job queue.
- **Works with zero API keys.** The builtin generation engine produces
  structured, platform-differentiated Russian-language content out of the
  box. Any OpenAI-compatible LLM API can be enabled with one env variable
  **or entered directly in the Settings UI** (stored AES-256-GCM encrypted).
- **In-app auto-publishing**: enable the toggle in Settings and approved
  content scheduled on the calendar publishes itself — no extra processes.
- **Brand safety enforced in code**: a brand guard + QA agent reject invented
  features, prices, customer counts and statistics. Unknown facts are marked
  unknown, never fabricated.
- **Human approval flow**: Draft → AI Review → Awaiting Approval → Approved →
  Published / Failed / Archived.
- **Mock integrations that never lie**: without social API credentials,
  publications stay clearly marked `MOCK` and are never reported as live.
- **Dashboard**: overview, ideas, calendar, production, approvals,
  publications, analytics, SEO, experiments, agents, settings.
- **Scheduler**: cron-driven workflows (daily research, ideas, weekly
  strategy, content production, SEO, analytics, reports).

## Quick start

```bash
cp example.env .env      # works as-is with SQLite + builtin engine
npm install
npm run db:setup         # create schema + seed brand knowledge & admin user
npm run dev              # http://localhost:3000
```

Login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
(default `admin@arendora.ru` / `ChangeMeNow2026` - change it).

Run the automation scheduler in a second terminal:

```bash
npm run scheduler
```

Full instructions: [SETUP.md](SETUP.md) - Architecture deep dive:
[ARCHITECTURE.md](ARCHITECTURE.md) - REST API reference: [API.md](API.md).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:setup` | `prisma db push` + seed |
| `npm run db:postgres` | Switch schema to PostgreSQL (docker-compose provided) |
| `npm run scheduler` | Start the cron scheduler process |
| `npm test` | Unit + integration + API tests (vitest) |
| `npm run test:e2e` | E2E workflow against a running server |

## Content channels

TikTok - Instagram (Reels + carousels) - X/Twitter (posts + threads) -
Threads - SEO (keyword clusters + articles).

## The critical brand rule

> Never invent Arendora features, prices, customers, statistics or claims.
> If data is missing, mark it as unknown instead of fabricating it.

This is enforced at three layers: the brand knowledge base injected into
every prompt (`BrandRule`/`ProductKnowledge` tables), the programmatic brand
guard (`src/lib/brand.ts`), and the QA agent which hard-rejects violations.

## Documentation

- [SETUP.md](SETUP.md) - installation, env variables, PostgreSQL, Docker
- [ARCHITECTURE.md](ARCHITECTURE.md) - modules, data model, agent pipeline
- [API.md](API.md) - REST API reference
- [CONTRIBUTING.md](CONTRIBUTING.md) - how to add agents, platforms, workflows
