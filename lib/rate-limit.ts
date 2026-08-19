import { prisma } from "@/lib/prisma";

// DB-backed (see RateLimitHit in schema) so it's correct across Vercel's
// serverless instances, which don't share in-memory state. Returns true if
// the action is allowed (and records the hit); false if the caller is over
// the limit for this window.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs);
  const count = await prisma.rateLimitHit.count({
    where: { key, createdAt: { gte: windowStart } },
  });
  if (count >= limit) return false;

  await prisma.rateLimitHit.create({ data: { key } });
  return true;
}
