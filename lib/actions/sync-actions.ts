"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { syncAllActiveSeasons, type SyncResult } from "@/lib/sync-standings";
import { syncPlayersForActiveSeasons } from "@/lib/sync-players";

export interface SyncNowResult {
  players: SyncResult[];
  standings: SyncResult[];
}

// Manual equivalent of the Vercel Cron job, for local testing and for an
// admin who doesn't want to wait for the next scheduled run.
export async function syncStandingsNow(): Promise<SyncNowResult> {
  await requireAdmin();
  const players = await syncPlayersForActiveSeasons();
  const standings = await syncAllActiveSeasons();
  revalidatePath("/admin");
  return { players, standings };
}
