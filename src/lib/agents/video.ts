// Video Agent: turns a short-form script into a full video production
// package - hook, scene-by-scene script, voiceover, visual instructions,
// captions, CTA, title, thumbnail concept. Prioritizes product screen
// recordings and UI demonstrations; no AI avatars.

import { prisma, createAgentContext, createLogger, agentGenerate } from "./base";

export async function runVideoAgent(contentItemId: string) {
  const logger = createLogger();
  const ctx = await createAgentContext(logger);
  logger.log(`Video Agent: packaging content item ${contentItemId}`);

  const item = await prisma.contentItem.findUnique({
    where: { id: contentItemId },
    include: { idea: true, variants: true },
  });
  if (!item) throw new Error(`Content item not found: ${contentItemId}`);

  const base = item.variants.find((v) => v.kind === "tiktok_script") ?? item.variants.find((v) => v.kind === "ig_reel");
  if (!base) throw new Error("No short-form script variant found to package; run the Content Agent first");

  const { data } = await agentGenerate<Record<string, unknown>>(
    ctx,
    "video_package",
    { kind: base.kind, ideaTitle: item.idea.title, angle: item.idea.angle ?? "", seed: `${item.id}:video:v${base.version + 1}` },
    "You are the Video Agent for Arendora. Build a video production package from the idea. " +
      "Prioritize product screen recordings, UI demonstrations, data and visual explanations. " +
      "Do NOT use AI avatars. Everything in Russian. JSON shape: " +
      "{ hook, scenes[{timecode, visual, voiceover, onScreenText}], voiceover, visualInstructions[], captions, cta, title, thumbnail }.",
    `Idea: "${item.idea.title}". Base script payload for reference: ${base.payload.slice(0, 2000)}`,
  );

  const existing = await prisma.contentVariant.findFirst({
    where: { contentItemId: item.id, kind: "video_package" },
  });

  let variant;
  if (existing) {
    variant = await prisma.contentVariant.update({
      where: { id: existing.id },
      data: {
        payload: JSON.stringify(data),
        version: existing.version + 1,
        updatedAt: new Date(),
      },
    });
  } else {
    variant = await prisma.contentVariant.create({
      data: {
        contentItemId: item.id,
        platform: base.platform,
        kind: "video_package",
        payload: JSON.stringify(data),
        status: "ai_review",
        version: 1,
      },
    });
  }

  logger.log(`video package stored: variant ${variant.id}`);
  return { variantId: variant.id, logs: logger.lines() };
}
