---
description: Run the full Arendora content pipeline once - research, ideas, strategy, content production, QA
allowed-tools: Bash
---

Run one full content production cycle against the local Arendora Content OS
(server must be running on localhost:3000).

1. Login as admin and save the session cookie (credentials from .env:
   ADMIN_EMAIL / ADMIN_PASSWORD):

```bash
curl -s -c /tmp/arendora-cookies -X POST localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin@arendora.ru\",\"password\":\"ChangeMeNow2026\"}"
```

2. Run these workflows in order via
   `POST /api/v1/agents {"workflow": "...", "payload": {...}}`:
   `daily_research` → `daily_ideas` (count 3) → `weekly_strategy` →
   `content_production` → `qa_review`.
3. Report: how many research items, ideas, selected ideas, content items,
   variants and their QA scores. Flag anything that failed QA twice.

$ARGUMENTS
