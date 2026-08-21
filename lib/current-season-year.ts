import { prisma } from "@/lib/prisma";

// The shared season-year cycle used to gate once-per-season actions (like
// changing a username) — the most recent year among any league's currently
// non-finalized season. All 5 leagues' seasons count as one shared cycle,
// not five independent ones. Null if every season is finalized or none
// exist yet, meaning there's no active cycle to gate against.
export async function getCurrentSeasonYear(): Promise<number | null> {
  const season = await prisma.season.findFirst({
    where: { status: { not: "FINALIZED" } },
    orderBy: { year: "desc" },
    select: { year: true },
  });
  return season?.year ?? null;
}
