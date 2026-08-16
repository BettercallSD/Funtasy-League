"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveDraftPrediction, lockInPrediction } from "@/lib/actions/prediction-actions";

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTeams((current) => {
      const oldIndex = current.findIndex((team) => team.id === active.id);
      const newIndex = current.findIndex((team) => team.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
    setSavedMessage(null);
  }

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={teams.map((team) => team.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="border-bk-border divide-bk-border divide-y overflow-hidden rounded-lg border">
            {teams.map((team, index) => (
              <TeamRow key={team.id} team={team} position={index + 1} disabled={readOnly} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

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

function TeamRow({
  team,
  position,
  disabled,
}: {
  team: PredictionTeam;
  position: number;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-bk-surface flex items-center gap-3 px-4 py-3 ${isDragging ? "opacity-60" : ""}`}
    >
      <span className="font-display text-bk-text-secondary w-6 tabular-nums">{position}</span>
      {team.crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-entered crest URLs, not in next/image's remote allowlist
        <img src={team.crestUrl} alt="" width={24} height={24} className="shrink-0" />
      ) : (
        <span className="bg-bk-surface-raised h-6 w-6 shrink-0 rounded-full" />
      )}
      <span className="flex-1 text-sm font-medium">{team.name}</span>
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-bk-text-secondary cursor-grab touch-none px-2 active:cursor-grabbing"
          aria-label={`Drag to reorder ${team.name}`}
        >
          ⠿
        </button>
      )}
    </li>
  );
}
