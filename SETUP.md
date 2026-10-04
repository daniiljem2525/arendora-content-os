# SETUP

## Requirements

- Node.js 20+ (tested on 22/24)
- npm 10+
- Docker (optional - for PostgreSQL)

## 1. Install

```bash
cd arendora-content-os
npm install
```

## 2. Configure environment

```bash
cp example.env .env
```

The defaults work immediately: SQLite database + builtin generation engine.
No API keys are required.

Generate an `AUTH_SECRET` before serious use:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Change `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the defaults.

## 3. Create the database and seed

```bash
npm run db:setup
```

This runs `prisma db push` and seeds: brand rules (positioning, audience,
tone of voice, prohibited claims, CTA rules...), product knowledge,
platforms, starter keywords, the default campaign, the admin user and the
default scheduler jobs.

## 4. Run

```bash
npm run dev          # dashboard + API on http://localhost:3000
npm run scheduler    # cron automation (separate terminal)
```

Log in at http://localhost:3000/login with your admin credentials.

## Optional: enable the LLM API

The platform runs on the builtin engine by default. To use any
OpenAI-compatible API instead:

```env
OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.openai.com/v1"   # or any compatible endpoint
OPENAI_MODEL="gpt-4o-mini"
```

The settings page and AI Agents page always show which engine is active.
`MOCK_LLM=true` forces the builtin engine even when a key is present.

## Supabase (managed PostgreSQL)

Supabase can host the database (not the app itself - see hosting notes below).

1. Create a project at supabase.com, set a database password.
2. Copy the **Session pooler** connection string (Connect → Session pooler, port 5432).
3. Switch the schema and apply it:
   ```bash
   npm run db:postgres        # switch prisma schema to postgresql
   # put the connection string into DATABASE_URL in .env
   npx prisma db push && npx prisma generate
   npm run db:seed
   ```
4. Restart the app - all data now lives in Supabase and survives redeployments.

## Hosting the app itself

The app needs a long-running Node process (auto-publish loop, scheduler).

- **VPS / Railway / Fly.io / Render** - recommended: deploy the provided
  Dockerfile / docker-compose.yml; X is reachable from most non-RU regions.
- **Vercel** - possible, but set `CRON_SECRET` and call
  `GET /api/v1/cron/publish` every minute from an external scheduler
  (cron-job.org or Vercel Cron) instead of the in-process loop.

## Optional: credentials in the app (no .env editing)

Open **Settings** in the dashboard: every integration has a form where you
can enter tokens (and reference login/password notes). Values are encrypted
with AES-256-GCM (key derived from `AUTH_SECRET`) and stored in the database;
they are never shown again and take priority over `.env`.

## Auto-publishing

Enable **Автопубликация** on the Settings page: every minute the app checks
the content calendar and publishes approved content whose scheduled time has
arrived. Without platform API credentials publications stay in clearly
labeled MOCK mode (never reported as real). The standalone
`npm run scheduler` process is still available for the full cron workflows.

All integrations are optional; every adapter has a mock mode.

| Integration | Env variables | Effect when unset |
| --- | --- | --- |
| Web search | `TAVILY_API_KEY` / `BRAVE_API_KEY` / `SERPER_API_KEY` | Research uses builtin pool, search marked `[mock]` |
| Instagram/Meta | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Publishing stays MOCK |
| Threads | `THREADS_ACCESS_TOKEN`, `THREADS_USER_ID` | Publishing stays MOCK |
| X | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN` | Publishing stays MOCK |
| TikTok | `TIKTOK_ACCESS_TOKEN` | Publishing stays MOCK |
| Google Search Console | `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN`, `GSC_PROPERTY_URL` | No site metrics collected |
| Google Analytics 4 | `GOOGLE_ANALYTICS_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` | No site metrics collected |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Job failure alerts logged locally only |

Important: in mock mode publications are **never** reported as `published`.
Demo analytics data (`ANALYTICS_MOCK_DATA=true`) is always labeled `MOCK`.

## PostgreSQL (production)

```bash
docker compose up -d db                # starts postgres:16
npm run db:postgres                    # switches schema.prisma to the postgres variant
DATABASE_URL="postgresql://arendora:arendora_dev_password@localhost:5432/arendora_content_os" \
  npx prisma db push && npx prisma generate
npm run db:postgres:revert             # switch back to SQLite
```

Or run the whole stack (Postgres + app + scheduler) with:

```bash
docker compose up --build
```

## Tests

```bash
npm test          # unit + integration + API (isolated test.db, no network)
npm run test:e2e  # full workflow against a running server (dev or prod)
```

The e2e script logs in, runs research → ideas → strategy → content →
approval → publication → analytics and exits non-zero on any failure.

## Troubleshooting

- **Port 3000 busy** - change port: `npm run dev -- -p 3001`.
- **`AUTH_SECRET must be set`** - copy example.env to .env.
- **Schema drift after switching DB providers** - re-run `npx prisma generate`.
- **Scheduler doesn't fire** - check jobs on the AI Agents page; the
  scheduler process must be running (`npm run scheduler`).
