import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface FixtureInput {
  homeTeamId: string;
  awayTeamId: string;
  kickoff?: string;
}

/**
 * Admin action: set (replace) the fixtures for a gameweek. There's no
 * account system for MVP — anyone with the pool's invite link is trusted to
 * manage it, same as a group chat admin.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; number: string }> }
) {
  const { code, number } = await params;
  const gameWeekNumber = Number(number);

  const body = await req.json().catch(() => null);
  const fixtures: FixtureInput[] = Array.isArray(body?.fixtures) ? body.fixtures : [];

  if (fixtures.length === 0) {
    return NextResponse.json({ error: "At least one fixture is required." }, { status: 400 });
  }
  for (const f of fixtures) {
    if (!f.homeTeamId || !f.awayTeamId) {
      return NextResponse.json({ error: "Each fixture needs a homeTeamId and awayTeamId." }, { status: 400 });
    }
    if (f.homeTeamId === f.awayTeamId) {
      return NextResponse.json({ error: "A team can't play itself." }, { status: 400 });
    }
  }

  const pool = await prisma.pool.findUnique({ where: { inviteCode: code.toUpperCase() } });
  if (!pool) {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }

  const gameWeek = await prisma.gameWeek.findUnique({
    where: { poolId_number: { poolId: pool.id, number: gameWeekNumber } },
    include: { picks: true },
  });
  if (!gameWeek) {
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }
  if (gameWeek.locked) {
    return NextResponse.json({ error: "This gameweek is already locked." }, { status: 422 });
  }
  if (gameWeek.picks.length > 0) {
    return NextResponse.json(
      { error: "Picks already exist for this gameweek — clear them first if fixtures changed." },
      { status: 422 }
    );
  }

  await prisma.$transaction([
    prisma.fixture.deleteMany({ where: { gameWeekId: gameWeek.id } }),
    prisma.fixture.createMany({
      data: fixtures.map((f) => ({
        gameWeekId: gameWeek.id,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        kickoff: f.kickoff ? new Date(f.kickoff) : null,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
