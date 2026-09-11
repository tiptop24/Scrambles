import { PrismaClient } from "@prisma/client";
import { generateInviteCode } from "../src/lib/inviteCode";

const prisma = new PrismaClient();

// 2025-26 Premier League clubs.
const TEAMS: { name: string; shortName: string }[] = [
  { name: "Arsenal", shortName: "ARS" },
  { name: "Aston Villa", shortName: "AVL" },
  { name: "Bournemouth", shortName: "BOU" },
  { name: "Brentford", shortName: "BRE" },
  { name: "Brighton & Hove Albion", shortName: "BHA" },
  { name: "Burnley", shortName: "BUR" },
  { name: "Chelsea", shortName: "CHE" },
  { name: "Crystal Palace", shortName: "CRY" },
  { name: "Everton", shortName: "EVE" },
  { name: "Fulham", shortName: "FUL" },
  { name: "Leeds United", shortName: "LEE" },
  { name: "Liverpool", shortName: "LIV" },
  { name: "Manchester City", shortName: "MCI" },
  { name: "Manchester United", shortName: "MUN" },
  { name: "Newcastle United", shortName: "NEW" },
  { name: "Nottingham Forest", shortName: "NFO" },
  { name: "Sunderland", shortName: "SUN" },
  { name: "Tottenham Hotspur", shortName: "TOT" },
  { name: "West Ham United", shortName: "WHU" },
  { name: "Wolverhampton Wanderers", shortName: "WOL" },
];

const GAMEWEEKS_PER_SEASON = 38;

async function main() {
  for (const team of TEAMS) {
    await prisma.team.upsert({
      where: { name: team.name },
      update: { shortName: team.shortName },
      create: team,
    });
  }
  console.log(`Seeded ${TEAMS.length} Premier League teams.`);

  const existingDemo = await prisma.pool.findFirst({ where: { name: "Demo Pool" } });
  if (existingDemo) {
    console.log(`Demo pool already exists — invite code ${existingDemo.inviteCode}`);
    return;
  }

  const pool = await prisma.pool.create({
    data: {
      name: "Demo Pool",
      inviteCode: generateInviteCode(),
      gameWeeks: {
        create: Array.from({ length: GAMEWEEKS_PER_SEASON }, (_, i) => ({ number: i + 1 })),
      },
      players: {
        create: [{ name: "Alex" }, { name: "Sam" }, { name: "Jordan" }],
      },
    },
  });

  console.log(`Created demo pool "${pool.name}" — invite code: ${pool.inviteCode}`);
  console.log("Add fixtures for gameweek 1 from the pool's admin page, then share the invite code.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
