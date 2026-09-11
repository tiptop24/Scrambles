import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Enter a name to join." }, { status: 400 });
  }
  if (name.length > 40) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }

  const pool = await prisma.pool.findUnique({ where: { inviteCode: code.toUpperCase() } });
  if (!pool) {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }

  const existing = await prisma.player.findUnique({
    where: { poolId_name: { poolId: pool.id, name } },
  });
  if (existing) {
    // Re-joining with the same name just resumes that player — low-friction, no accounts.
    return NextResponse.json({ playerId: existing.id });
  }

  const player = await prisma.player.create({ data: { poolId: pool.id, name } });
  return NextResponse.json({ playerId: player.id }, { status: 201 });
}
