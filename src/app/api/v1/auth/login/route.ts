import { z } from "zod";
import { handler, json, parseBody, validate, ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });

export const POST = handler(async ({ req }) => {
  const { email, password } = validate(schema, await parseBody(req));
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new ApiError(401, "Invalid email or password");
  }
  const token = await createSessionToken({ sub: user.id, email: user.email, role: user.role });
  const res = json({ ok: true, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
  return res;
}, { auth: "public", rateLimit: 10, rateLimitKey: "login" });
