import { handler, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ session }) => {
  return json({ session });
}, { rateLimit: 60 });
