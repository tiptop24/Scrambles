import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const alt = "Premier League Pick 'Em pool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await prisma.pool.findUnique({
    where: { inviteCode: code.toUpperCase() },
    include: { players: true, gameWeeks: { orderBy: { number: "asc" } } },
  });

  const poolName = pool?.name ?? "Pick 'Em Pool";
  const totalPlayers = pool?.players.length ?? 0;
  const aliveCount = pool?.players.filter((p) => !p.eliminated).length ?? 0;
  const currentGameWeek = pool?.gameWeeks.find((gw) => !gw.locked)?.number ?? 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#37003c",
          color: "white",
          fontFamily: "sans-serif",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 32, fontWeight: 700 }}>
          Scrambles <span style={{ color: "#00ff85", marginLeft: 12 }}>⚽</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>
            {poolName}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.7)", marginTop: 16 }}>
            Gameweek {currentGameWeek} · Premier League Pick &apos;Em
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#00ff85" }}>
              {aliveCount}
            </div>
            <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.7)" }}>
              still alive
            </div>
          </div>
          {totalPlayers > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "rgba(255,255,255,0.4)" }}>
                {totalPlayers}
              </div>
              <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.7)" }}>
                total players
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
