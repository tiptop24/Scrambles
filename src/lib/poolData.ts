import { prisma } from "@/lib/db";

export function loadPool(inviteCode: string) {
  return prisma.pool.findUnique({
    where: { inviteCode },
    include: {
      players: {
        include: { picks: true },
        orderBy: { createdAt: "asc" },
      },
      gameWeeks: {
        orderBy: { number: "asc" },
        include: {
          fixtures: {
            include: { homeTeam: true, awayTeam: true },
            orderBy: { kickoff: "asc" },
          },
        },
      },
    },
  });
}

export type LoadedPool = NonNullable<Awaited<ReturnType<typeof loadPool>>>;

/** The gameweek players should currently be picking for — the first one not yet locked. */
export function findCurrentGameWeek(pool: LoadedPool) {
  return pool.gameWeeks.find((gw) => !gw.locked) ?? pool.gameWeeks[pool.gameWeeks.length - 1];
}
