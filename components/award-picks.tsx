import { PlayerPicker, type PlayerOption } from "@/components/player-picker";
import { TeamPicker, type TeamOption } from "@/components/team-picker";
import { AwardCategory } from "@/lib/generated/prisma/enums";

// Named fields rather than keying by AwardCategory directly — TS requires
// an intersection type (PlayerOption & TeamOption) for writes through a
// union-typed index, which no real value can satisfy.
export interface AwardSelections {
  goldenBoot?: PlayerOption;
  mostAssists?: PlayerOption;
  youngPlayer?: PlayerOption;
  emergingPlayer?: PlayerOption;
  surpriseTeam?: TeamOption;
  disappointingTeam?: TeamOption;
}

// Each category gets its own "popular picks" list — the popular Golden Boot
// pick and the popular Young Player pick are unrelated, so sharing one list
// across categories would be misleading.
export interface PopularPlayerPicks {
  goldenBoot: PlayerOption[];
  mostAssists: PlayerOption[];
  youngPlayer: PlayerOption[];
  emergingPlayer: PlayerOption[];
}

export function AwardPicks({
  seasonId,
  teams,
  popular,
  selections,
  disabled,
}: {
  seasonId: string;
  teams: TeamOption[];
  popular: PopularPlayerPicks;
  selections: AwardSelections;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PlayerPicker
        seasonId={seasonId}
        category={AwardCategory.GOLDEN_BOOT}
        label="Golden Boot"
        popularPlayers={popular.goldenBoot}
        selected={selections.goldenBoot ?? null}
        disabled={disabled}
      />
      <PlayerPicker
        seasonId={seasonId}
        category={AwardCategory.MOST_ASSISTS}
        label="Most Assists"
        popularPlayers={popular.mostAssists}
        selected={selections.mostAssists ?? null}
        disabled={disabled}
      />
      <PlayerPicker
        seasonId={seasonId}
        category={AwardCategory.YOUNG_PLAYER}
        label="Young Player of the Season"
        popularPlayers={popular.youngPlayer}
        selected={selections.youngPlayer ?? null}
        disabled={disabled}
      />
      <PlayerPicker
        seasonId={seasonId}
        category={AwardCategory.EMERGING_PLAYER}
        label="Emerging Player (U23)"
        u23Only
        popularPlayers={popular.emergingPlayer}
        selected={selections.emergingPlayer ?? null}
        disabled={disabled}
      />
      <TeamPicker
        seasonId={seasonId}
        category={AwardCategory.SURPRISE_TEAM}
        label="Surprise Team"
        teams={teams}
        selected={selections.surpriseTeam ?? null}
        disabled={disabled}
      />
      <TeamPicker
        seasonId={seasonId}
        category={AwardCategory.DISAPPOINTING_TEAM}
        label="Disappointing Team"
        teams={teams}
        selected={selections.disappointingTeam ?? null}
        disabled={disabled}
      />
    </div>
  );
}
