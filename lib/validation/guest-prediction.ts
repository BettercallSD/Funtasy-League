import { z } from "zod";

export const guestPredictionSchema = z.object({
  seasonId: z.string().min(1),
  teamIds: z.array(z.string().min(1)).min(1),
  goldenBootPlayerId: z.string().min(1).optional(),
  mostAssistsPlayerId: z.string().min(1).optional(),
  youngPlayerPlayerId: z.string().min(1).optional(),
  emergingPlayerPlayerId: z.string().min(1).optional(),
  surpriseTeamId: z.string().min(1).optional(),
  disappointingTeamId: z.string().min(1).optional(),
  turnstileToken: z.string().min(1, "Please complete the verification challenge."),
});

export type GuestPredictionInput = z.infer<typeof guestPredictionSchema>;
