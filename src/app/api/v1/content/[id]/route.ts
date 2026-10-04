import { handler, json, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ req }, ctxParams: { params: Promise<{ id: string }> }) => {
  const { id } = await ctxParams.params;
  const item = await prisma.contentItem.findUnique({
    where: { id },
      include: { variants: true, idea: true, campaign: true },
  });
  if (!item) throw new ApiError(404, "Content item not found");
  return json({ item });
});
