---
name: research
description: Run or review Arendora content research - pain points, trends, competitor topics, SEO opportunities for landlords with 3-30 properties. Use when the user asks to research content ideas or find audience pain points for Arendora marketing.
---

# Arendora Research

Research the Arendora audience: landlords with 3-30 rental properties and
small property managers who currently use Excel, Google Sheets, Telegram and
notes.

## Hard rules

- Never copy third-party content verbatim. Summarize insights in original words.
- Never invent Arendora features, prices, customers or statistics. Mark unknown data as unknown.

## Running research through the platform

```bash
curl -s -b cookies.txt -X POST localhost:3000/api/v1/research \
  -H 'Content-Type: application/json' \
  -d '{"perType":2,"useWeb":true,"topic":"управление арендой"}'
```

Types: `pain_point`, `trend`, `competitor_topic`, `seo_opportunity`,
`audience_question`.

## Doing research by hand (when no server is running)

1. Search for discussions by Russian landlords about учет платежей,
   просрочки, Excel vs сервисы, напоминания арендаторам.
2. For each finding write: title, summary (2-3 sentences, original wording),
   type, evidence signals, sourceUrl.
3. Insert into the DB via the API or store as a draft for the user.

## Where results live

- Dashboard: Ideas page → "Research insights" table.
- DB table: `ResearchItem` (status `new` until ideas are generated from it).
