import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validatePick, type PickData } from "@/lib/gameLogic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json().catch(() => null);
  const playerId = typeof body?.playerId === "string" ? body.playerId : "";
  const gameWeekId = typeof body?.gameWeekId === "string" ? body.gameWeekId : "";
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";

  if (!playerId || !gameWeekId || !teamId) {
    return NextResponse.json({ error: "playerId, gameWeekId and teamId are required." }, { status: 400 });
  }

  const pool = await prisma.pool.findUnique({ where: { inviteCode: code.toUpperCase() } });
  if (!pool) {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }

  const player = await prisma.player.findFirst({
    where: { id: playerId, poolId: pool.id },
    include: { picks: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Player not found in this pool." }, { status: 404 });
  }

  const gameWeek = await prisma.gameWeek.findFirst({
    where: { id: gameWeekId, poolId: pool.id },
    include: { fixtures: true },
  });
  if (!gameWeek) {
    return NextResponse.json({ error: "Gameweek not found in this pool." }, { status: 404 });
  }

  const existingPicksForPlayer: PickData[] = player.picks.map((p) => ({
    id: p.id,
    playerId: p.playerId,
    gameWeekId: p.gameWeekId,
    teamId: p.teamId,
    result: p.result as PickData["result"],
    goalDifference: p.goalDifference,
  }));
  const existingPickForThisWeek = existingPicksForPlayer.find((p) => p.gameWeekId === gameWeekId);

  const validation = validatePick({
    player: { id: player.id, name: player.name, eliminated: player.eliminated, eliminatedWeekNo: player.eliminatedWeekNo },
    gameWeek: { locked: gameWeek.locked },
    teamId,
    existingPicksForPlayer,
    existingPickForThisWeek,
    fixturesForGameWeek: gameWeek.fixtures.map((f) => ({
      id: f.id,
      gameWeekId: f.gameWeekId,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      status: f.status as "SCHEDULED" | "FINAL",
      homeScore: f.homeScore,
      awayScore: f.awayScore,
    })),
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 422 });
  }

  const fixture = gameWeek.fixtures.find((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)!;

  const pick = await prisma.pick.create({
    data: { playerId: player.id, gameWeekId, teamId, fixtureId: fixture.id },
  });

  return NextResponse.json({ pickId: pick.id }, { status: 201 });
}
