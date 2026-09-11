// Shapes returned by the pool API, used by client components.

export interface TeamDTO {
  id: string;
  name: string;
  shortName: string;
}

export interface FixtureDTO {
  id: string;
  gameWeekId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: "SCHEDULED" | "FINAL";
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: TeamDTO;
  awayTeam: TeamDTO;
}

export interface GameWeekDTO {
  id: string;
  number: number;
  locked: boolean;
  fixtures: FixtureDTO[];
}

export interface GameWeekSummaryDTO {
  id: string;
  number: number;
  locked: boolean;
  fixtureCount: number;
}

export interface PlayerDTO {
  id: string;
  name: string;
  eliminated: boolean;
  eliminatedWeekNo: number | null;
  usedTeamIds: string[];
  pickForCurrentWeek: { teamId: string; result: string } | null;
}

export interface StandingsRowDTO {
  playerId: string;
  name: string;
  alive: boolean;
  weeksSurvived: number;
  cumulativeGoalDifference: number;
  eliminatedWeekNo: number | null;
}

export interface PoolOverviewDTO {
  pool: { id: string; name: string; inviteCode: string };
  teams: TeamDTO[];
  gameWeeks: GameWeekSummaryDTO[];
  currentGameWeek: GameWeekDTO;
  players: PlayerDTO[];
  standings: StandingsRowDTO[];
}
