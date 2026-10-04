// Status and platform vocabularies. SQLite does not support Prisma enums,
// so these string unions are the single source of truth, enforced via Zod.

export const CONTENT_STATUSES = [
  "draft",
  "ai_review",
  "awaiting_approval",
  "approved",
  "published",
  "failed",
  "archived",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const PLATFORM_KEYS = ["tiktok", "instagram", "x", "threads", "seo"] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export const VARIANT_KINDS = [
  "tiktok_script",
  "ig_reel",
  "ig_carousel",
  "x_post",
  "x_thread",
  "threads_post",
  "seo_brief",
  "video_package",
] as const;
export type VariantKind = (typeof VARIANT_KINDS)[number];

export const RESEARCH_TYPES = [
  "pain_point",
  "trend",
  "competitor_topic",
  "seo_opportunity",
  "audience_question",
] as const;

export const PUBLICATION_STATUSES = ["pending", "published", "failed", "mock"] as const;

export const CAMPAIGN_GOALS = ["traffic", "registrations", "activation", "revenue"] as const;

export function isContentStatus(v: string): v is ContentStatus {
  return (CONTENT_STATUSES as readonly string[]).includes(v);
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ai_review: "AI Review",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  published: "Published",
  failed: "Failed",
  archived: "Archived",
};
