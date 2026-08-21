import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// Auth endpoints (sign-in start, OAuth callback, sign-out) are one of the
// four endpoints CLAUDE.md explicitly calls out for rate limiting. Limit is
// generous — a normal sign-in round trip hits this handler a few times —
// but enough to blunt automated hammering of the callback endpoint.
async function withRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
): Promise<Response> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`auth:${ip}`, 30, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many auth requests — try again shortly." },
      { status: 429 },
    );
  }
  return handler(request);
}

export const GET = (request: NextRequest) => withRateLimit(request, handlers.GET);
export const POST = (request: NextRequest) => withRateLimit(request, handlers.POST);
