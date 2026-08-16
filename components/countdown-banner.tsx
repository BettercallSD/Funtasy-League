"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Starts at null (rendering nothing) and only computes the real value after
// mount, so server-rendered and first-client-render output always match —
// ticking clocks are a classic hydration-mismatch trap otherwise.
export function CountdownBanner({ lockAt }: { lockAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(lockAt).getTime();
    function tick() {
      setRemaining(target - Date.now());
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [lockAt]);

  if (remaining === null || remaining <= 0) return null;

  return (
    <p className="border-bk-border bg-bk-surface text-bk-text-secondary mb-4 rounded-md border px-4 py-2 text-sm font-medium">
      Predictions close in{" "}
      <span className="font-display text-bk-text">{formatRemaining(remaining)}</span>
    </p>
  );
}
