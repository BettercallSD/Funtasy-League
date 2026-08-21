"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { LEAGUES, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { AccountMenu } from "@/components/account-menu";

export function TopNav({ session }: { session: Session | null }) {
  const pathname = usePathname();

  return (
    <header className="border-bk-border bg-bk-surface border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link
          href="/"
          className="font-display text-bk-text shrink-0 text-lg font-bold tracking-tight"
        >
          Ball Knowledge
        </Link>
        <nav className="flex h-full flex-1 items-center gap-1 overflow-x-auto">
          {LEAGUES.map((league) => {
            const href = `/leagues/${league.slug}`;
            const isActive = pathname === href;
            const accent = LEAGUE_ACCENT_CLASSES[league.slug];
            return (
              <Link
                key={league.slug}
                href={href}
                className={`font-display border-b-2 px-3 py-4 text-sm font-semibold tracking-wide whitespace-nowrap transition-colors ${
                  isActive
                    ? `${accent.border} ${accent.text}`
                    : "text-bk-text-secondary hover:text-bk-text border-transparent"
                }`}
              >
                {league.shortName}
              </Link>
            );
          })}
          <Link
            href="/friend-leagues"
            className={`font-display border-b-2 px-3 py-4 text-sm font-semibold tracking-wide whitespace-nowrap transition-colors ${
              pathname.startsWith("/friend-leagues")
                ? "border-bk-text text-bk-text"
                : "text-bk-text-secondary hover:text-bk-text border-transparent"
            }`}
          >
            Friend Leagues
          </Link>
        </nav>
        <AccountMenu session={session} />
      </div>
    </header>
  );
}
