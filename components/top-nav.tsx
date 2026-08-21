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
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-6 sm:px-4">
        <Link
          href="/"
          className="font-display text-bk-text shrink-0 text-base font-bold tracking-tight sm:text-lg"
        >
          Funtasy League
        </Link>
        <nav className="flex h-full min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:gap-1">
          {LEAGUES.map((league) => {
            const href = `/leagues/${league.slug}`;
            const isActive = pathname === href;
            const accent = LEAGUE_ACCENT_CLASSES[league.slug];
            return (
              <Link
                key={league.slug}
                href={href}
                title={league.name}
                aria-label={league.name}
                className={`flex shrink-0 items-center border-b-2 px-2 py-3 transition-colors sm:px-3 ${
                  isActive ? accent.border : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- external competition emblem, not in next/image's remote allowlist */}
                <img src={league.logoUrl} alt={league.name} className="h-6 w-6 object-contain" />
              </Link>
            );
          })}
          <Link
            href="/friend-leagues"
            className={`font-display border-b-2 px-2 py-4 text-sm font-semibold tracking-wide whitespace-nowrap transition-colors sm:px-3 ${
              pathname.startsWith("/friend-leagues")
                ? "border-bk-text text-bk-text"
                : "text-bk-text-secondary hover:text-bk-text border-transparent"
            }`}
          >
            <span className="sm:hidden">Leagues</span>
            <span className="hidden sm:inline">Friend Leagues</span>
          </Link>
        </nav>
        <AccountMenu session={session} />
      </div>
    </header>
  );
}
