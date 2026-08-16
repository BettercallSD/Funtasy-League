import { z } from "zod";

// Shape-only validation — completeness (every team present, exactly once)
// and membership (every id actually belongs to this season) require a DB
// read of the season's teams, so those checks live in the server action,
// right after this parse and before any write.
export const teamOrderSchema = z.object({
  seasonId: z.string().min(1),
  teamIds: z.array(z.string().min(1)).min(1),
});

export type TeamOrderInput = z.infer<typeof teamOrderSchema>;
