---
name: x
description: Generate or review Arendora X/Twitter posts and threads - terse insight-driven tweets under 280 characters. Use when the user wants X/Twitter content for Arendora.
---

# Arendora X (Twitter)

## Format rules

- Threads of 3-4 tweets, each ≤280 characters (hard QA check).
- Terse, insight-driven; no hashtag spam.
- Lead with a concrete observation about managing rentals (payments,
  tenants, portfolio), end the thread with the CTA and arendora.ru.
- Russian language.

## Hard rules

- Never invent Arendora features, prices, customers or statistics.
- Must differ from the TikTok/Instagram/Threads variants of the same idea.

## Generating via the platform

`POST /api/v1/content { "ideaId": "..." }` produces an `x_thread` variant.
`GET /api/v1/variants/{id}` returns the parsed payload (`tweets[]`).

## QA specifics

- `platform_compliance` rejects any tweet over 280 chars.
- Originality is checked against other `x_thread` variants.
