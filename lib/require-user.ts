import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// For pages that need a real (non-guest) signed-in user. `signIn()` sets a
// CSRF cookie, so it can only run inside a Server Action/Route Handler —
// never during a Server Component's render — hence the redirect to a real
// sign-in page (app/signin) rather than calling signIn() directly here.
export async function requireUser(callbackUrl: string): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session;
}
