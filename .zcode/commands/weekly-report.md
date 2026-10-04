---
description: Build the weekly performance report - analytics summary, learning insights, next-week recommendations
allowed-tools: Bash
---

Create the weekly report for Arendora Content OS:

1. Login as admin (ADMIN_EMAIL/ADMIN_PASSWORD from .env).
2. `GET /api/v1/analytics?days=7` - funnel summary; note the isMock flag.
3. `GET /api/v1/learning` - top insights by confidence.
4. `GET /api/v1/approvals` - what is waiting for review.
5. Write a concise report: funnel numbers (labeled mock/live), what worked
   (hooks/formats/CTAs per insights), what is pending approval, and 3
   recommendations for next week.
6. Optionally send via `POST /api/v1/agents {"workflow":"weekly_report"}`.
