import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@/lib/generated/prisma/client";

// Admin gate for both pages and server actions. Re-checks isAdmin against
// the User record on every call rather than trusting the JWT session's
// isAdmin claim (which only refreshes on next sign-in, so a revoked admin
// would otherwise stay privileged until they re-authenticate). Calls
// notFound() instead of returning a 403 so the section's existence isn't
// disclosed to non-admins.
export async function requireAdmin(): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isAdmin) notFound();

  return user;
}
