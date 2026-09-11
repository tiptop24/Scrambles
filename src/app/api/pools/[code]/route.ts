import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadPool, findCurrentGameWeek } from "@/lib/poolData";
import { computeStandings, getUsedTeamIds, type PickData, type PlayerData } from "@/lib/gameLogic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const pool = await loadPool(code.toUpperCase());
  if (!pool) {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  const currentGameWeek = findCurrentGameWeek(pool);

  const allPicks: PickData[] = pool.players.flatMap((p) =>
    p.picks.map((pick) => ({
      id: pick.id,
      playerId: pick.playerId,
      gameWeekId: pick.gameWeekId,
      teamId: pick.teamId,
      result: pick.result as PickData["result"],
      goalDifference: pick.goalDifference,
    }))
  );

  const playerData: PlayerData[] = pool.players.map((p) => ({
    id: p.id,
    name: p.name,
    eliminated: p.eliminated,
    eliminatedWeekNo: p.eliminatedWeekNo,
  }));

  const standings = computeStandings(playerData, allPicks);

  const players = pool.players.map((p) => {
    const usedTeamIds = Array.from(getUsedTeamIds(allPicks, p.id));
    const pickForCurrentWeek = p.picks.find((pk) => pk.gameWeekId === currentGameWeek?.id) ?? null;
    return {
      id: p.id,
      name: p.name,
      eliminated: p.eliminated,
      eliminatedWeekNo: p.eliminatedWeekNo,
      usedTeamIds,
      pickForCurrentWeek: pickForCurrentWeek
        ? { teamId: pickForCurrentWeek.teamId, result: pickForCurrentWeek.result }
        : null,
    };
  });

  return NextResponse.json({
    pool: { id: pool.id, name: pool.name, inviteCode: pool.inviteCode },
    teams,
    gameWeeks: pool.gameWeeks.map((gw) => ({
      id: gw.id,
      number: gw.number,
      locked: gw.locked,
      fixtureCount: gw.fixtures.length,
    })),
    currentGameWeek,
    players,
    standings,
  });
}
