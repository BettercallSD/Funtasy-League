"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DraggableTeamList } from "@/components/draggable-team-list";
import {
  AwardPicks,
  type AwardSelections,
  type PopularPlayerPicks,
} from "@/components/award-picks";
import type { PredictionTeam } from "@/components/prediction-board";
import type { TeamOption } from "@/components/team-picker";
import type { PlayerOption } from "@/components/player-picker";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { submitGuestPrediction } from "@/lib/actions/guest-prediction-actions";

// Unlike the authenticated flow (persists every drag/pick immediately),
// guests build the whole prediction in local state and submit it in one
// shot — that single submission is what CLAUDE.md gates on Turnstile.
export function GuestPredictionForm({
  slug,
  seasonId,
  initialTeams,
  awardTeams,
  popular,
}: {
  slug: string;
  seasonId: string;
  initialTeams: PredictionTeam[];
  awardTeams: TeamOption[];
  popular: PopularPlayerPicks;
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [selections, setSelections] = useState<AwardSelections>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleAwardChange(
    field: keyof AwardSelections,
    value: PlayerOption | TeamOption | null,
  ) {
    setSelections((current) => ({ ...current, [field]: value ?? undefined }));
  }

  function handleFinalizeClick() {
    setError(null);
    if (!turnstileToken) {
      setError("Please complete the verification challenge.");
      return;
    }
    setShowConfirm(true);
  }

  function handleConfirmSubmit() {
    setShowConfirm(false);
    if (!turnstileToken) return;
    startTransition(async () => {
      try {
        await submitGuestPrediction({
          seasonId,
          teamIds: teams.map((team) => team.id),
          goldenBootPlayerId: selections.goldenBoot?.id,
          mostAssistsPlayerId: selections.mostAssists?.id,
          youngPlayerPlayerId: selections.youngPlayer?.id,
          emergingPlayerPlayerId: selections.emergingPlayer?.id,
          surpriseTeamId: selections.surpriseTeam?.id,
          disappointingTeamId: selections.disappointingTeam?.id,
          turnstileToken,
        });
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      <DraggableTeamList teams={teams} onReorder={setTeams} />

      <div className="mt-10">
        <h2 className="font-display text-xl font-bold">Award predictions</h2>
        <div className="mt-4">
          <AwardPicks
            seasonId={seasonId}
            teams={awardTeams}
            popular={popular}
            selections={selections}
            disabled={false}
            onAwardChange={handleAwardChange}
          />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <TurnstileWidget onVerify={setTurnstileToken} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={handleFinalizeClick}
            className="font-display bg-bk-text text-bk-bg rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? "Submitting…" : "Finalize my prediction"}
          </button>
          {error && <span className="text-bk-bundesliga text-sm">{error}</span>}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="border-bk-border bg-bk-surface w-full max-w-sm rounded-lg border p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold">Before you finish…</h3>
            <p className="text-bk-text-secondary mt-2 text-sm">
              This won&apos;t be saved to an account — you&apos;ll get a link to your result, but if
              you lose it, it&apos;s gone for good. Sign in first if you want it saved and easy to
              find later.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <Link
                href={`/predict/${slug}`}
                className="font-display border-bk-border rounded-full border px-4 py-2 text-sm font-semibold"
              >
                Sign in instead
              </Link>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="font-display bg-bk-text text-bk-bg rounded-full px-4 py-2 text-sm font-semibold"
              >
                Continue as guest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
