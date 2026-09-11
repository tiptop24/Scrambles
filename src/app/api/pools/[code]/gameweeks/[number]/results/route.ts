import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  processGameWeekResults,
  findPlayersMissingPick,
  type FixtureData,
  type PickData,
  type PlayerData,
} from "@/lib/gameLogic";

interface ResultInput {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
}

/**
 * Admin action: submit final scores for a gameweek's fixtures. Scores every
 * pick, eliminates non-winners (and anyone alive who never picked), then
 * locks the gameweek so it can't be re-processed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; number: string }> }
) {
  const { code, number } = await params;
  const gameWeekNumber = Number(number);

  const body = await req.json().catch(() => null);
  const results: ResultInput[] = Array.isArray(body?.results) ? body.results : [];

  if (results.length === 0) {
    return NextResponse.json({ error: "At least one result is required." }, { status: 400 });
  }
  for (const r of results) {
    if (!r.fixtureId || !Number.isInteger(r.homeScore) || !Number.isInteger(r.awayScore)) {
      return NextResponse.json(
        { error: "Each result needs a fixtureId, integer homeScore and integer awayScore." },
        { status: 400 }
      );
    }
    if (r.homeScore < 0 || r.awayScore < 0) {
      return NextResponse.json({ error: "Scores can't be negative." }, { status: 400 });
    }
  }

  const pool = await prisma.pool.findUnique({ where: { inviteCode: code.toUpperCase() } });
  if (!pool) {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }

  const gameWeek = await prisma.gameWeek.findUnique({
    where: { poolId_number: { poolId: pool.id, number: gameWeekNumber } },
    include: { fixtures: true, picks: true },
  });
  if (!gameWeek) {
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }
  if (gameWeek.locked) {
    return NextResponse.json({ error: "This gameweek is already locked." }, { status: 422 });
  }

  const fixtureIds = new Set(gameWeek.fixtures.map((f) => f.id));
  for (const r of results) {
    if (!fixtureIds.has(r.fixtureId)) {
      return NextResponse.json({ error: `Fixture ${r.fixtureId} isn't in this gameweek.` }, { status: 400 });
    }
  }
  if (results.length !== gameWeek.fixtures.length) {
    return NextResponse.json(
      { error: "Submit a result for every fixture in the gameweek before locking it." },
      { status: 422 }
    );
  }

  await prisma.$transaction(
    results.map((r) =>
      prisma.fixture.update({
        where: { id: r.fixtureId },
        data: { status: "FINAL", homeScore: r.homeScore, awayScore: r.awayScore },
      })
    )
  );

  const finalFixtures: FixtureData[] = gameWeek.fixtures.map((f) => {
    const r = results.find((res) => res.fixtureId === f.id)!;
    return {
      id: f.id,
      gameWeekId: f.gameWeekId,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      status: "FINAL",
      homeScore: r.homeScore,
      awayScore: r.awayScore,
    };
  });

  const pendingPicks: PickData[] = gameWeek.picks.map((p) => ({
    id: p.id,
    playerId: p.playerId,
    gameWeekId: p.gameWeekId,
    teamId: p.teamId,
    result: p.result as PickData["result"],
    goalDifference: p.goalDifference,
  }));

  const outcomes = processGameWeekResults(pendingPicks, finalFixtures);

  const alivePlayers = await prisma.player.findMany({ where: { poolId: pool.id, eliminated: false } });
  const alivePlayerData: PlayerData[] = alivePlayers.map((p) => ({
    id: p.id,
    name: p.name,
    eliminated: p.eliminated,
    eliminatedWeekNo: p.eliminatedWeekNo,
  }));
  const missingPickPlayers = findPlayersMissingPick(alivePlayerData, pendingPicks);

  const eliminatedPlayerIds = new Set([
    ...outcomes.filter((o) => o.eliminated).map((o) => o.playerId),
    ...missingPickPlayers.map((p) => p.id),
  ]);

  await prisma.$transaction([
    ...outcomes.map((o) =>
      prisma.pick.update({
        where: { id: o.pickId },
        data: { result: o.result, goalDifference: o.goalDifference },
      })
    ),
    ...Array.from(eliminatedPlayerIds).map((playerId) =>
      prisma.player.update({
        where: { id: playerId },
        data: { eliminated: true, eliminatedWeekNo: gameWeekNumber },
      })
    ),
    prisma.gameWeek.update({ where: { id: gameWeek.id }, data: { locked: true } }),
  ]);

  return NextResponse.json({
    ok: true,
    eliminatedCount: eliminatedPlayerIds.size,
  });
}
