---
name: analytics
description: Collect, read and interpret Arendora marketing analytics - funnel from impressions to registrations and conversions, plus learning insights. Use when the user asks about performance, metrics or what content works.
---

# Arendora Analytics

## Collecting metrics

`POST /api/v1/analytics { "days": 7 }` - runs the Analytics Agent.
Live publications pull insights from platform APIs; site metrics from
GSC/GA4. With `ANALYTICS_MOCK_DATA=true` demo metrics are stored and always
flagged `isMock` (shown as MOCK in the dashboard).

## Reading the funnel

`GET /api/v1/analytics?days=30` returns impressions → views → likes →
saves → clicks → profile/website visits → registrations → activated users →
conversions, with per-platform breakdown.

**Business impact beats vanity metrics**: registrations, activated users and
conversions weigh 10/15/40x vs impressions in the learning scoring.

## Learning insights

`GET /api/v1/learning` - winning hooks, topics, formats, CTAs, posting
times with confidence and evidence. Inject the top findings into new
generation briefs.

## Reporting

`POST /api/v1/agents { "workflow": "weekly_report" }` - builds the weekly
summary and sends it to Telegram when configured.

Always state whether data is mock or live when presenting numbers to the user.
