"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// A friend league can also be joined by clicking its invite link directly
// (/join/[code]) — this form is for the case where someone was just told
// the code itself (e.g. read aloud, texted as plain text) rather than
// clicking a link.
export function JoinByCodeForm() {
  const [code, setCode] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = code.trim();
        if (trimmed) router.push(`/join/${encodeURIComponent(trimmed)}`);
      }}
      className="border-bk-border bg-bk-surface flex items-center gap-2 rounded-lg border p-3"
    >
      <input
        type="text"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="Have an invite code? Enter it here…"
        className="border-bk-border bg-bk-bg flex-1 rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={!code.trim()}
        className="border-bk-border shrink-0 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        Join
      </button>
    </form>
  );
}
