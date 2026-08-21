"use client";

import { useState, useTransition } from "react";
import { setUsername } from "@/lib/actions/user-actions";

export function UsernameForm({ currentUsername }: { currentUsername: string | null }) {
  const [value, setValue] = useState(currentUsername ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await setUsername(value);
        setSaved(true);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Pick a username…"
        maxLength={20}
        className="border-bk-border bg-bk-bg w-48 rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={isPending || value.trim().length === 0}
        className="border-bk-border rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {currentUsername ? "Update" : "Save"}
      </button>
      {saved && <span className="text-bk-serie-a text-sm">Saved.</span>}
      {error && <span className="text-bk-bundesliga text-sm">{error}</span>}
    </form>
  );
}
