"use client";

import { useState } from "react";
import { DraggableTeamList, type DraggableTeam } from "@/components/draggable-team-list";

export type FinalTableTeam = DraggableTeam;

// Renders one hidden `position_<teamId>` input per team, kept in sync with
// drag order — the surrounding <form> on the finalize page submits these
// exactly like it would plain number inputs, so the server action needs no
// changes at all.
export function FinalTablePicker({ teams: initialTeams }: { teams: FinalTableTeam[] }) {
  const [teams, setTeams] = useState(initialTeams);

  return (
    <div>
      <DraggableTeamList teams={teams} onReorder={setTeams} />
      {teams.map((team, index) => (
        <input key={team.id} type="hidden" name={`position_${team.id}`} value={index + 1} />
      ))}
    </div>
  );
}
