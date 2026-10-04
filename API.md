# REST API

Base URL: `/api/v1`. All endpoints require the `arendora_session` cookie
(login first) except `health` and `login`. Rate limits are per IP; exceeding
them returns `429` with `retryAfterSec`. Validation failures return `400`
with field details; auth failures return `401`.

## Auth

| Method | Path | Body / notes |
| --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` - sets session cookie (10 req/min) |
| POST | `/auth/logout` | clears the session |
| GET | `/auth/me` | current session payload |

## Health

`GET /health` (public) → `{ status, db, llm, time }`

## Research & ideas

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/research?type=&status=` | list research items |
| POST | `/research` | `{ perType?, useWeb?, topic? }` - run the Research Agent |
| GET | `/ideas?status=` | list ideas with scores |
| POST | `/ideas` | `{ title, angle, campaignId? }` - manual idea |
| PATCH | `/ideas?id=` | `{ status?, title?, angle?, campaignId? }` |

## Strategy

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/strategy` | recent weekly strategy plans |
| POST | `/strategy?weekCount=5` | score & select ideas, create plan |

## Content & variants

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/content?status=` | list content items |
| GET | `/content?id=` or `/content/{id}` | detail incl. variants |
| POST | `/content` | `{ ideaId, campaignId? }` - produce all platform variants (runs QA, regenerates rejects once) |
| PATCH | `/content` | `{ action: "qa_review"\|"archive", contentItemId }` |
| GET | `/variants/{id}` | variant with parsed payload + QA report |
| PATCH | `/variants/{id}` | `{ payload?, status? }` - manual edits |

## Approvals

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/approvals` | items `awaiting_approval` + SEO articles in review |
| POST | `/approvals` | `{ contentItemId? , variantId?, decision: "approve"\|"reject"\|"archive", note? }` |

## Calendar & campaigns

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/calendar?from=&to=` | scheduled events + unscheduled approved items |
| POST | `/calendar` | `{ contentItemId, scheduledAt, platform?, campaignId? }` |
| DELETE | `/calendar?contentItemId=` | unschedule |
| GET / POST | `/campaigns` | list / create `{ name, goal?, notes? }` |

## Publications & analytics

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/publications?status=` | publications with mode (live/mock) |
| POST | `/publications` | `{ variantId }` - publish via platform adapter (mock mode keeps status `mock`) |
| GET | `/analytics?days=30` | funnel summary + per-platform breakdown (`isMock` flag) |
| POST | `/analytics` | `{ days? }` - run the Analytics Agent |

## SEO

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/seo` | keywords |
| GET | `/seo?resource=articles` | articles |
| POST | `/seo` | `{ count? }` keyword research, or `{ keywordId }` to write an article |

## Experiments

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/experiments?id=` | list / detail |
| POST | `/experiments` | `{ name, hypothesis, kind?, variants: [{key, description}] (2-6) }` |
| PATCH | `/experiments` | `{ id, status: running\|completed\|archived }` |

## Agents & jobs

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/agents` | workflows, job definitions, recent runs, counters, engine mode |
| POST | `/agents` | `{ workflow, payload? }` - run any workflow manually |
| GET | `/learning` | learning insights with evidence |

Workflows: `daily_research`, `daily_ideas`, `weekly_strategy`,
`content_production`, `video_production` (payload `{contentItemId}`),
`seo_research`, `seo_article` (payload `{keywordId}`), `qa_review`,
`analytics_collection`, `learning`, `publish_scheduled`, `weekly_report`.

## Settings (brand & jobs)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/settings` | brand rules, product knowledge, job definitions, integration status (no secrets) |
| PUT | `/settings` | `{ key, value }` - update a brand rule |
| PATCH | `/settings` | `{ key, enabled?, cron? }` - enable/disable or reschedule a job |

## Example session

```bash
curl -c jar -X POST localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@arendora.ru","password":"..."}'

curl -b jar -X POST localhost:3000/api/v1/agents \
  -H 'Content-Type: application/json' \
  -d '{"workflow":"daily_ideas","payload":{"count":3}}'
```
