import { z } from "zod";
import { handler, json, parseBody, validate } from "@/lib/api";
import { prisma } from "@/lib/db";
import { publishVariant } from "@/lib/integrations/social";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ req }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const publications = await prisma.publication.findMany({
    where: status ? { status } : undefined,
    include: {
      variant: { select: { kind: true, platform: true, contentItemId: true, contentItem: { select: { title: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json({ publications });
});

const publishSchema = z.object({ variantId: z.string().cuid() });

export const POST = handler(async ({ req }) => {
  const { variantId } = validate(publishSchema, await parseBody(req));
  const result = await publishVariant(variantId);
  return json(result, { status: result.status === "failed" ? 502 : 201 });
}, { rateLimit: 20 });
