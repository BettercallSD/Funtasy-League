import { z } from "zod";

// League formats genuinely differ year to year (CLAUDE.md) — these counts
// are always admin-entered, never hardcoded, but they still have to make
// internal sense relative to each other. European slots are broken out per
// competition (UCL/Europa/Conference) rather than one vague "Europe" count,
// since those shift independently with UEFA coefficient rules.
export const seasonFormSchema = z
  .object({
    year: z.coerce.number().int().min(1900).max(2200),
    teamCount: z.coerce.number().int().min(2).max(64),
    directRelegationCount: z.coerce.number().int().min(0).max(64),
    playoffRelegationCount: z.coerce.number().int().min(0).max(64),
    championsLeagueSlots: z.coerce.number().int().min(0).max(64),
    europaLeagueSlots: z.coerce.number().int().min(0).max(64),
    conferenceLeagueSlots: z.coerce.number().int().min(0).max(64),
    predictionLockAt: z.coerce.date(),
  })
  .refine((data) => data.directRelegationCount + data.playoffRelegationCount <= data.teamCount, {
    message: "Direct + playoff relegation counts can't exceed the team count",
    path: ["playoffRelegationCount"],
  })
  .refine(
    (data) =>
      data.championsLeagueSlots + data.europaLeagueSlots + data.conferenceLeagueSlots <=
      data.teamCount,
    {
      message: "Champions League + Europa + Conference slots can't exceed the team count",
      path: ["conferenceLeagueSlots"],
    },
  );

export type SeasonFormValues = z.infer<typeof seasonFormSchema>;

export const seasonTeamFormSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(100),
  shortName: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  crestUrl: z
    .union([z.url({ protocol: /^https?$/, message: "Must be an http(s) URL" }), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  promoted: z.boolean().default(false),
  relegated: z.boolean().default(false),
});

export type SeasonTeamFormValues = z.infer<typeof seasonTeamFormSchema>;

// The actual scoring-on-finalize logic lands in Phase 5 — this just
// validates the shape of the data the admin enters. Player-based award
// fields are optional here since Player rows only start existing once the
// football-data.org sync (Phase 5) or later manual entry populates them.
export const finalizeSeasonSchema = z.object({
  tableEntries: z
    .array(
      z.object({
        teamId: z.string().min(1),
        finalPosition: z.number().int().min(1),
      }),
    )
    .min(1),
  goldenBootPlayerId: z.string().min(1).optional(),
  mostAssistsPlayerId: z.string().min(1).optional(),
  youngPlayerPlayerId: z.string().min(1).optional(),
  emergingPlayerPlayerId: z.string().min(1).optional(),
  surpriseTeamId: z.string().min(1).optional(),
  disappointingTeamId: z.string().min(1).optional(),
});

export type FinalizeSeasonValues = z.infer<typeof finalizeSeasonSchema>;
