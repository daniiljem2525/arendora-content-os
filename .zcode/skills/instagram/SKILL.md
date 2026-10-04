---
name: instagram
description: Generate or review Arendora Instagram content - Reel scripts and multi-slide carousels with captions and hashtags. Use when the user wants Instagram content for Arendora.
---

# Arendora Instagram

## Format rules

- **Reel**: lifestyle-professional tone, beat-by-beat direction (хук → сценарий → выгода → CTA), caption with 4-6 hashtags (#аренда #арендодатели #недвижимость #сдаюквартиру #arendora).
- **Carousel**: 6-8 slides; each slide = headline (max 6 words) + body (max 30 words) + visual direction; designed to be saved.
- Product screen recordings preferred; no AI avatars.
- Russian language. Standard CTA: "Ведите объекты, арендаторов и платежи в Arendora → arendora.ru".

## Hard rules

- Never invent Arendora features, prices, customers or statistics.
- Different text from the TikTok/X/Threads variants of the same idea.

## Generating via the platform

`POST /api/v1/content { "ideaId": "..." }` produces `ig_reel` and
`ig_carousel` variants. Review them on the Approval Queue page or via
`GET /api/v1/approvals`.
