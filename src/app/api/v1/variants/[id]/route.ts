import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ req }, ctxParams: { params: Promise<{ id: string }> }) => {
  const { id } = await ctxParams.params;
  const variant = await prisma.contentVariant.findUnique({ where: { id } });
  if (!variant) throw new ApiError(404, "Variant not found");
  return json({ variant: { ...variant, payload: JSON.parse(variant.payload), qaReport: variant.qaReport ? JSON.parse(variant.qaReport) : null } });
});

const patchSchema = z.object({
  payload: z.record(z.unknown()).optional(),
  status: z.enum(["draft", "ai_review", "awaiting_approval", "approved", "published", "failed", "archived"]).optional(),
});

export const PATCH = handler(async ({ req }, ctxParams: { params: Promise<{ id: string }> }) => {
  const { id } = await ctxParams.params;
  const data = validate(patchSchema, await parseBody(req));
  const variant = await prisma.contentVariant.update({
    where: { id },
    data: {
      ...(data.payload && { payload: JSON.stringify(data.payload) }),
      ...(data.status && { status: data.status }),
    },
  });
  return json({ variant });
});
