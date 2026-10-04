---
name: threads
description: Generate or review Arendora Threads posts - conversational storytelling under 500 characters ending with a question or CTA. Use when the user wants Threads content for Arendora.
---

# Arendora Threads

## Format rules

- Conversational story or observation, ≤500 characters (hard QA check).
- Ends with a question to the audience or a soft CTA.
- Tone: peer-to-peer, calm, no hard selling.
- Russian language. Standard CTA: "Ведите объекты, арендаторов и платежи в Arendora → arendora.ru".

## Hard rules

- Never invent Arendora features, prices, customers or statistics.
- Must be a distinct piece, not a re-post of the X or Instagram variant.

## Generating via the platform

`POST /api/v1/content { "ideaId": "..." }` produces a `threads_post`
variant. The QA agent checks length, CTA presence, brand safety and
duplication; rejected variants are regenerated once automatically.
