import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const prediction = await prisma.prediction.findUnique({
    where: { guestToken: token },
    include: {
      season: { include: { league: true } },
      tableEntries: { include: { team: true }, orderBy: { predictedPosition: "asc" }, take: 5 },
    },
  });

  if (!prediction) {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e14",
          color: "#f1f5f9",
          fontSize: 48,
        }}
      >
        Ball Knowledge
      </div>,
      size,
    );
  }

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0a0e14",
        color: "#f1f5f9",
        padding: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 26,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: 2,
        }}
      >
        {prediction.season.league.name} · {prediction.submittedLabel}
      </div>
      <div style={{ display: "flex", fontSize: 52, fontWeight: 700, marginTop: 16 }}>
        My Ball Knowledge Prediction
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 44 }}>
        {prediction.tableEntries.map((entry) => (
          <div key={entry.id} style={{ display: "flex", fontSize: 34 }}>
            <div style={{ display: "flex", width: 70, color: "#94a3b8" }}>
              {entry.predictedPosition}
            </div>
            <div style={{ display: "flex" }}>{entry.team.name}</div>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
