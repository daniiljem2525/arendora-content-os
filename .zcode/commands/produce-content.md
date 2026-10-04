---
description: Generate new content from the top-scoring selected idea and walk through approval
allowed-tools: Bash
---

Produce content for one idea and bring it to approval:

1. Login as admin (ADMIN_EMAIL/ADMIN_PASSWORD from .env).
2. `GET /api/v1/ideas?status=selected` - pick the highest `totalScore` idea
   (or the id passed as $ARGUMENTS).
3. `POST /api/v1/content {"ideaId": "<id>"}` - produces 6 platform variants
   with QA.
4. Show each variant's platform, kind, QA score and the TikTok hook +
   Threads text. Recommend approve/reject per variant.
5. Do NOT auto-approve - present the pieces and wait for the user's decision.
