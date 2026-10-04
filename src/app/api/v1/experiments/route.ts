import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ req }) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const experiment = await prisma.experiment.findUnique({ where: { id } });
    if (!experiment) throw new ApiError(404, "Experiment not found");
    return json({ experiment });
  }
  const experiments = await prisma.experiment.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return json({ experiments });
});

const createSchema = z.object({
  name: z.string().min(3).max(200),
  hypothesis: z.string().min(5).max(2000),
  kind: z.enum(["hook", "cta", "format", "topic", "time"]).optional(),
  variants: z.array(z.object({ key: z.string().max(50), description: z.string().max(500) })).min(2).max(6),
});

export const POST = handler(async ({ req }) => {
  const data = validate(createSchema, await parseBody(req));
  const experiment = await prisma.experiment.create({
    data: { name: data.name, hypothesis: data.hypothesis, kind: data.kind ?? "hook", variants: JSON.stringify(data.variants) },
  });
  return json({ experiment }, { status: 201 });
}, { rateLimit: 30 });

const completeSchema = z.object({ id: z.string().cuid(), status: z.enum(["running", "completed", "archived"]) });

export const PATCH = handler(async ({ req }) => {
  const data = validate(completeSchema, await parseBody(req));
  const experiment = await prisma.experiment.update({
    where: { id: data.id },
    data: { status: data.status, ...(data.status === "completed" && { endDate: new Date() }) },
  });
  return json({ experiment });
});
