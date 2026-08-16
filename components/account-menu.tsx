import type { Session } from "next-auth";
import Image from "next/image";
import { signInWithGoogle, signOutAction } from "@/lib/actions/auth-actions";

export function AccountMenu({ session }: { session: Session | null }) {
  if (!session?.user) {
    return (
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="bg-bk-text text-bk-bg rounded-full px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-white"
        >
          Sign in
        </button>
      </form>
    );
  }

  const { name, image } = session.user;

  return (
    <details className="group relative">
      <summary className="hover:bg-bk-surface-raised flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pr-3 pl-1">
        {image ? (
          <Image src={image} alt="" width={28} height={28} className="rounded-full" />
        ) : (
          <span className="bg-bk-surface-raised flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">
            {name?.[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        <span className="text-bk-text-secondary group-hover:text-bk-text text-sm font-medium">
          {name}
        </span>
      </summary>
      <div className="border-bk-border bg-bk-surface-raised absolute right-0 z-10 mt-2 w-40 rounded-lg border p-1 shadow-lg">
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-bk-text-secondary hover:bg-bk-border hover:text-bk-text w-full rounded-md px-3 py-2 text-left text-sm"
          >
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
