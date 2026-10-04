---
name: tiktok
description: Generate or review Arendora TikTok scripts - hook, scene-by-scene beats, screen-recording visual instructions, voiceover, captions, CTA. Use when the user wants TikTok content for Arendora.
---

# Arendora TikTok

## Format rules

- 30-45 seconds, hook in the first 3 seconds.
- Prioritize product screen recordings and UI demonstrations - no AI avatars.
- Captions/on-screen text mandatory (most viewers watch muted).
- Russian language. One CTA at the end: "Ведите объекты, арендаторов и платежи в Arendora → arendora.ru".

## Hard rules

- Never invent Arendora features, prices, customers or statistics.
- Unknown numbers → ask the viewer a question instead of claiming.

## Generating via the platform

1. Content Agent creates the `tiktok_script` variant for an idea:
   `POST /api/v1/content { "ideaId": "..." }`
2. Video Agent builds the full package (hook, scenes, voiceover, visual
   instructions, captions, CTA, title, thumbnail):
   `POST /api/v1/agents { "workflow": "video_production", "payload": { "contentItemId": "..." } }`

## Review checklist (QA)

- Hook 20-140 chars, concrete, no hype.
- Every scene has: timecode, visual (screen recording cue), voiceover, on-screen text.
- CTA present exactly once.
- Passes brand guard (no fabricated % / counts / prices).
