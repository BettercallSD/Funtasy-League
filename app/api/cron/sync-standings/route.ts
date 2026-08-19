import { NextRequest, NextResponse } from "next/server";
import { syncAllActiveSeasons } from "@/lib/sync-standings";

// Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>` — reject
// anything else so this public URL can't be used to spam football-data.org
// or trigger a bulk projected-score recompute on demand.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAllActiveSeasons();
  return NextResponse.json({ results });
}
