import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInviteCode } from "@/lib/inviteCode";

const GAMEWEEKS_PER_SEASON = 38;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Pool name is required." }, { status: 400 });
  }

  // Invite codes are short and random — collisions are astronomically rare,
  // but retry a couple of times rather than trust that blindly.
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const pool = await prisma.pool.create({
        data: {
          name,
          inviteCode,
          gameWeeks: {
            create: Array.from({ length: GAMEWEEKS_PER_SEASON }, (_, i) => ({ number: i + 1 })),
          },
        },
      });
      return NextResponse.json({ inviteCode: pool.inviteCode }, { status: 201 });
    } catch (err: any) {
      if (err?.code === "P2002") continue; // invite code collision, retry
      throw err;
    }
  }

  return NextResponse.json({ error: "Could not generate a unique invite code, try again." }, { status: 500 });
}
