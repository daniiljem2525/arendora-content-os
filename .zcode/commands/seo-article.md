---
description: Research SEO keywords and write one article for arendora.ru
allowed-tools: Bash
---

SEO workflow:

1. Login as admin (ADMIN_EMAIL/ADMIN_PASSWORD from .env).
2. If a keyword id was passed as $ARGUMENTS use it; otherwise run
   `POST /api/v1/seo {"count": 5}` and pick the best new keyword
   (informational intent, fits the учёт аренды / платежи / портфель clusters).
3. `POST /api/v1/seo {"keywordId": "<id>"}` to generate the article.
4. Show the title, meta description, outline and first section. Verify:
   no invented volume/difficulty numbers, meta ≤155 chars, no fabricated
   Arendora facts (brand rules in settings must hold).
5. Recommend publish or regenerate.
