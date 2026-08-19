"use client";

import { useState, useTransition } from "react";
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
  seasonId,
  initialTeams,
  awardTeams,
  popular,
}: {
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

  function handleAwardChange(
    field: keyof AwardSelections,
    value: PlayerOption | TeamOption | null,
  ) {
    setSelections((current) => ({ ...current, [field]: value ?? undefined }));
  }

  function handleSubmit() {
    setError(null);
    if (!turnstileToken) {
      setError("Please complete the verification challenge.");
      return;
    }
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
            onClick={handleSubmit}
            className="font-display bg-bk-text text-bk-bg rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? "Submitting…" : "Get my result card"}
          </button>
          {error && <span className="text-bk-bundesliga text-sm">{error}</span>}
        </div>
      </div>
    </div>
  );
}
