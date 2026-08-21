import { z } from "zod";

export const createFriendLeagueSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  seasonIds: z.array(z.string().min(1)).min(1, "Pick at least one season"),
});

export type CreateFriendLeagueValues = z.infer<typeof createFriendLeagueSchema>;
