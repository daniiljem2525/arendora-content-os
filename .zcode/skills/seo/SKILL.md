---
name: seo
description: Arendora SEO work - keyword research, clusters, article briefs and full articles with meta/H1/outline/FAQ schema. Use when the user wants SEO keywords or articles for arendora.ru.
---

# Arendora SEO

## Rules

- Articles must be genuinely useful: concrete steps, checklists, honest
  statements. No mass-generated filler.
- Volume/difficulty are UNKNOWN unless real data exists - never guess numbers.
- Cluster structure: учёт аренды → учёт платежей → аналитика портфеля.
- Russian language. Meta description ≤155 chars, title ≤60 chars.
- Internal links: suggest related cluster pages with reasons.
- FAQ blocks double as FAQPage schema suggestions.

## Via the platform

1. Keyword research: `POST /api/v1/seo { "count": 5 }`
2. Write article: `POST /api/v1/seo { "keywordId": "..." }`
3. Review: dashboard → SEO page (article reader shows body, FAQ, internal
   links) or `GET /api/v1/seo?resource=articles`.

Articles land in status `ai_review` and should be human-reviewed before
publishing to the site.
