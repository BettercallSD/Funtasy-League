import { z } from "zod";

export const createFriendLeagueSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  maxMembers: z.coerce.number().int().min(2).max(500),
  seasonIds: z.array(z.string().min(1)).min(1, "Pick at least one season"),
});

export type CreateFriendLeagueValues = z.infer<typeof createFriendLeagueSchema>;
