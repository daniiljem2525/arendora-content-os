// API route wrapper: authentication, rate limiting, Zod validation,
// structured error responses. Every /api/v1 route goes through this.

import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionFromRequest, type SessionPayload } from "./auth";
import { rateLimit } from "./rate-limit";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export interface HandlerContext {
  session: SessionPayload;
  req: Request;
}

export interface HandlerOptions {
  /** Authentication requirement. Default: "required". */
  auth?: "required" | "public";
  /** Rate limit: max requests per minute for this key. Default 120. */
  rateLimit?: number;
  /** Extra rate-limit key suffix (e.g. "login"). */
  rateLimitKey?: string;
}

function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handler(
  fn: (ctx: HandlerContext, routeCtx: { params: Promise<any> }) => Promise<Response>,
  options: HandlerOptions = {},
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, routeCtx: { params: Promise<any> }): Promise<Response> => {
    try {
      const limit = options.rateLimit ?? 120;
      const rl = rateLimit({
        key: `${options.rateLimitKey ?? "api"}:${clientKey(req)}`,
        limit,
      });
      if (!rl.ok) {
        return NextResponse.json(
          { error: "rate_limited", message: "Too many requests", retryAfterSec: rl.retryAfterSec },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
        );
      }

      let session: SessionPayload;
      if (options.auth === "public") {
        session = (await getSessionFromRequest(req)) ?? { sub: "anonymous", email: "", role: "guest" };
      } else {
        const s = await getSessionFromRequest(req);
        if (!s) {
          return NextResponse.json({ error: "unauthorized", message: "Authentication required" }, { status: 401 });
        }
        session = s;
      }

      return await fn({ session, req }, routeCtx ?? { params: Promise.resolve({}) });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: "api_error", message: err.message, details: err.details },
          { status: err.status },
        );
      }
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: "validation_error", message: "Invalid input", details: err.flatten().fieldErrors },
          { status: 400 },
        );
      }
      console.error("[api] unhandled error:", err);
      return NextResponse.json({ error: "internal_error", message: "Internal server error" }, { status: 500 });
    }
  };
}

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(400, "Invalid input", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export async function parseBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
}
