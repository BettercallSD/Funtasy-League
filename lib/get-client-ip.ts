import { headers } from "next/headers";

// Vercel sets x-forwarded-for on every request; falls back to a constant so
// local dev (no proxy) still gets a stable rate-limit bucket instead of
// throwing.
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
}
