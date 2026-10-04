---
name: qa
description: Review and QA Arendora content - hook strength, brand safety, platform limits, duplication, CTA quality. Use when the user wants to check, review or approve generated content.
---

# Arendora QA

## Automated QA (already enforced by the platform)

Run on pending variants: `POST /api/v1/agents { "workflow": "qa_review" }`

Checks per variant (weights): hook strength 20, clarity 10, brand safety 25,
CTA quality 15, platform compliance 15, originality 15.
Score ≥70 AND no hard-fail → `awaiting_approval`; otherwise `draft`
(regeneration is triggered once automatically by the Content Agent).

Hard-fails: duplication (trigram similarity ≥0.7 on distinctive fields),
brand violations (invented %/counts/prices, guarantee language).

## Manual review checklist

1. Does the hook survive "would I stop scrolling?".
2. Is every fact either in the brand knowledge base or explicitly unknown?
3. One CTA, matching the approved wording.
4. Reads naturally in Russian - no translationese, no template smell.
5. Distinct from other platforms' variants of the same idea.

## Human approval

Dashboard → Approval Queue, or `POST /api/v1/approvals
{ "contentItemId" | "variantId", "decision": "approve"|"reject" }`.
