"use client";

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

export interface DraggableTeam {
  id: string;
  name: string;
  crestUrl: string | null;
}

// Shared by the authenticated predict board, the admin finalize picker, and
// the guest predict form — one drag-and-drop team list implementation
// instead of three copies of the same dnd-kit wiring.
export function DraggableTeamList<T extends DraggableTeam>({
  teams,
  onReorder,
  disabled,
}: {
  teams: T[];
  onReorder: (teams: T[]) => void;
  disabled?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = teams.findIndex((team) => team.id === active.id);
    const newIndex = teams.findIndex((team) => team.id === over.id);
    onReorder(arrayMove(teams, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={teams.map((team) => team.id)} strategy={verticalListSortingStrategy}>
        <ol className="border-bk-border divide-bk-border divide-y overflow-hidden rounded-lg border">
          {teams.map((team, index) => (
            <TeamRow key={team.id} team={team} position={index + 1} disabled={Boolean(disabled)} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function TeamRow<T extends DraggableTeam>({
  team,
  position,
  disabled,
}: {
  team: T;
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
