import Link from "next/link";
import { signIn } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  async function signInAction() {
    "use server";
    await signIn("google", callbackUrl ? { redirectTo: callbackUrl } : undefined);
  }

  // If they were headed to a real prediction, offer the no-login version of
  // that same league as a lower-friction alternative — there's no guest
  // equivalent of viewing a leaderboard, so that link only makes sense here.
  const predictMatch = callbackUrl?.match(/^\/predict\/([a-z0-9-]+)/);
  const guestHref = predictMatch ? `/guest/predict/${predictMatch[1]}` : null;

  const subtitle = predictMatch
    ? "You need a Google account to lock in a real prediction."
    : "Sign up to unlock this feature.";

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Sign in to Funtasy League</h1>
      <p className="text-bk-text-secondary mt-2">{subtitle}</p>
      <form action={signInAction} className="mt-6">
        <button
          type="submit"
          className="bg-bk-text text-bk-bg rounded-full px-5 py-2 text-sm font-semibold"
        >
          Continue with Google
        </button>
      </form>
      {guestHref && (
        <Link href={guestHref} className="text-bk-text-secondary mt-4 text-sm underline">
          Or just try it without signing in
        </Link>
      )}
    </main>
  );
}
