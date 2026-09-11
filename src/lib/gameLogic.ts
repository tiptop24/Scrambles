// Core rules engine for the Pick 'Em game. Kept as pure functions over plain
// data (no Prisma import) so the rules can be unit tested in isolation and
// reused identically from API routes, scripts, or future clients.

export type PickResultValue = "PENDING" | "WIN" | "DRAW" | "LOSS";

export interface TeamRef {
  id: string;
  name: string;
}

export interface FixtureData {
  id: string;
  gameWeekId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: "SCHEDULED" | "FINAL";
  homeScore: number | null;
  awayScore: number | null;
}

export interface PlayerData {
  id: string;
  name: string;
  eliminated: boolean;
  eliminatedWeekNo: number | null;
}

export interface PickData {
  id: string;
  playerId: string;
  gameWeekId: string;
  teamId: string;
  result: PickResultValue;
  goalDifference: number;
}

/** Every team a player has ever picked — these can never be picked again. */
export function getUsedTeamIds(picks: PickData[], playerId: string): Set<string> {
  return new Set(picks.filter((p) => p.playerId === playerId).map((p) => p.teamId));
}

/** Teams still available for a player to pick (i.e. not used in a prior gameweek). */
export function getAvailableTeams(
  allTeams: TeamRef[],
  picks: PickData[],
  playerId: string
): TeamRef[] {
  const used = getUsedTeamIds(picks, playerId);
  return allTeams.filter((t) => !used.has(t.id));
}

export interface ValidatePickInput {
  player: PlayerData;
  gameWeek: { locked: boolean };
  teamId: string;
  /** All of this player's picks across every gameweek so far. */
  existingPicksForPlayer: PickData[];
  /** This player's pick for the target gameweek, if one already exists. */
  existingPickForThisWeek: PickData | undefined;
  /** Every fixture scheduled for the target gameweek. */
  fixturesForGameWeek: FixtureData[];
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/** Enforces: alive players only, one pick per week, never repeat a team, team must be playing. */
export function validatePick(input: ValidatePickInput): ValidationResult {
  const {
    player,
    gameWeek,
    teamId,
    existingPicksForPlayer,
    existingPickForThisWeek,
    fixturesForGameWeek,
  } = input;

  if (player.eliminated) {
    return { ok: false, reason: "Eliminated players can no longer make picks." };
  }
  if (gameWeek.locked) {
    return { ok: false, reason: "This gameweek is locked — results have already been processed." };
  }
  if (existingPickForThisWeek) {
    return { ok: false, reason: "You already made a pick for this gameweek." };
  }
  if (existingPicksForPlayer.some((p) => p.teamId === teamId)) {
    return {
      ok: false,
      reason: "You've already picked this team earlier this season — pick a different team.",
    };
  }
  const isPlaying = fixturesForGameWeek.some(
    (f) => f.homeTeamId === teamId || f.awayTeamId === teamId
  );
  if (!isPlaying) {
    return { ok: false, reason: "That team isn't playing this gameweek." };
  }
  return { ok: true };
}

export interface ProcessedPickOutcome {
  pickId: string;
  playerId: string;
  result: PickResultValue;
  goalDifference: number;
  eliminated: boolean;
}

/**
 * Scores every pick for a gameweek against its fixture's final result.
 * A win keeps the player alive; a draw or a loss eliminates them.
 * Throws if any relevant fixture isn't FINAL yet — never guess at a result.
 */
export function processGameWeekResults(
  picks: PickData[],
  fixtures: FixtureData[]
): ProcessedPickOutcome[] {
  return picks.map((pick) => {
    const fixture = fixtures.find(
      (f) => f.homeTeamId === pick.teamId || f.awayTeamId === pick.teamId
    );
    if (!fixture) {
      throw new Error(`No fixture found for team ${pick.teamId} in gameweek ${pick.gameWeekId}`);
    }
    if (fixture.status !== "FINAL" || fixture.homeScore == null || fixture.awayScore == null) {
      throw new Error(`Fixture ${fixture.id} is not final yet — cannot score pick ${pick.id}`);
    }

    const isHome = fixture.homeTeamId === pick.teamId;
    const goalsFor = isHome ? fixture.homeScore : fixture.awayScore;
    const goalsAgainst = isHome ? fixture.awayScore : fixture.homeScore;
    const goalDifference = goalsFor - goalsAgainst;
    const result: PickResultValue =
      goalDifference > 0 ? "WIN" : goalDifference === 0 ? "DRAW" : "LOSS";

    return {
      pickId: pick.id,
      playerId: pick.playerId,
      result,
      goalDifference,
      eliminated: result !== "WIN",
    };
  });
}

/** Alive players who never made a pick for the gameweek — a missed deadline eliminates you too. */
export function findPlayersMissingPick(
  alivePlayers: PlayerData[],
  picksForWeek: PickData[]
): PlayerData[] {
  const pickedPlayerIds = new Set(picksForWeek.map((p) => p.playerId));
  return alivePlayers.filter((p) => !p.eliminated && !pickedPlayerIds.has(p.id));
}

export interface StandingsRow {
  playerId: string;
  name: string;
  alive: boolean;
  weeksSurvived: number;
  cumulativeGoalDifference: number;
  eliminatedWeekNo: number | null;
}

/**
 * Ranks the pool: everyone still alive outranks everyone eliminated. Within
 * each group, more gameweeks survived wins; cumulative goal difference across
 * every scored pick is the tiebreaker, per the game's core rule.
 */
export function computeStandings(players: PlayerData[], picks: PickData[]): StandingsRow[] {
  const rows: StandingsRow[] = players.map((player) => {
    const scoredPicks = picks.filter((p) => p.playerId === player.id && p.result !== "PENDING");
    const cumulativeGoalDifference = scoredPicks.reduce((sum, p) => sum + p.goalDifference, 0);
    const weeksSurvived = scoredPicks.filter((p) => p.result === "WIN").length;

    return {
      playerId: player.id,
      name: player.name,
      alive: !player.eliminated,
      weeksSurvived,
      cumulativeGoalDifference,
      eliminatedWeekNo: player.eliminatedWeekNo,
    };
  });

  return rows.sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (a.weeksSurvived !== b.weeksSurvived) return b.weeksSurvived - a.weeksSurvived;
    return b.cumulativeGoalDifference - a.cumulativeGoalDifference;
  });
}
