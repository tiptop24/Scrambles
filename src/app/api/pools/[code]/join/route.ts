import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, clientKeyFrom } from "@/lib/rateLimit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const limit = rateLimit(`join-pool:${clientKeyFrom(req)}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many join attempts from this connection — try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

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
