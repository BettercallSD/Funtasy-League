"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { syncAllActiveSeasons, type SyncResult } from "@/lib/sync-standings";

// Manual equivalent of the Vercel Cron job, for local testing and for an
// admin who doesn't want to wait for the next scheduled run.
export async function syncStandingsNow(): Promise<SyncResult[]> {
  await requireAdmin();
  const results = await syncAllActiveSeasons();
  revalidatePath("/admin");
  return results;
}
