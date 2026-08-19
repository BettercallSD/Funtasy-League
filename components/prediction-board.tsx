"use client";

import { useState, useTransition } from "react";
import { saveDraftPrediction, lockInPrediction } from "@/lib/actions/prediction-actions";
import { DraggableTeamList } from "@/components/draggable-team-list";

export interface PredictionTeam {
  id: string;
  name: string;
  shortName: string | null;
  crestUrl: string | null;
}

export function PredictionBoard({
  seasonId,
  initialTeams,
  readOnly,
  readOnlyReason,
}: {
  seasonId: string;
  initialTeams: PredictionTeam[];
  readOnly: boolean;
  readOnlyReason?: string;
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function handleSubmit(
    action: (seasonId: string, teamIds: string[]) => Promise<void>,
    successMessage: string,
  ) {
    setError(null);
    startTransition(async () => {
      try {
        await action(
          seasonId,
          teams.map((team) => team.id),
        );
        setSavedMessage(successMessage);
      } catch (submitError) {
        setSavedMessage(null);
        setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      {readOnly && readOnlyReason && (
        <p className="border-bk-border bg-bk-surface text-bk-text-secondary mb-4 rounded-md border p-3 text-sm">
          {readOnlyReason}
        </p>
      )}

      <DraggableTeamList
        teams={teams}
        onReorder={(next) => {
          setTeams(next);
          setSavedMessage(null);
        }}
        disabled={readOnly}
      />

      {!readOnly && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit(saveDraftPrediction, "Draft saved.")}
            className="border-bk-border rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit(lockInPrediction, "Locked in — good luck!")}
            className="bg-bk-text text-bk-bg rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Lock in my prediction
          </button>
          {savedMessage && <span className="text-bk-serie-a text-sm">{savedMessage}</span>}
          {error && <span className="text-bk-bundesliga text-sm">{error}</span>}
        </div>
      )}
    </div>
  );
}
