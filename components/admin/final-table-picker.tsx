"use client";

import { useState } from "react";
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

export interface FinalTableTeam {
  id: string;
  name: string;
  crestUrl: string | null;
}

// Renders one hidden `position_<teamId>` input per team, kept in sync with
// drag order — the surrounding <form> on the finalize page submits these
// exactly like it would plain number inputs, so the server action needs no
// changes at all.
export function FinalTablePicker({ teams: initialTeams }: { teams: FinalTableTeam[] }) {
  const [teams, setTeams] = useState(initialTeams);

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
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={teams.map((team) => team.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="border-bk-border divide-bk-border divide-y overflow-hidden rounded-lg border">
            {teams.map((team, index) => (
              <TeamRow key={team.id} team={team} position={index + 1} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {teams.map((team, index) => (
        <input key={team.id} type="hidden" name={`position_${team.id}`} value={index + 1} />
      ))}
    </div>
  );
}

function TeamRow({ team, position }: { team: FinalTableTeam; position: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
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
        <img src={team.crestUrl} alt="" width={20} height={20} className="shrink-0" />
      ) : (
        <span className="bg-bk-surface-raised h-5 w-5 shrink-0 rounded-full" />
      )}
      <span className="flex-1 text-sm font-medium">{team.name}</span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-bk-text-secondary cursor-grab touch-none px-2 active:cursor-grabbing"
        aria-label={`Drag to reorder ${team.name}`}
      >
        ⠿
      </button>
    </li>
  );
}
