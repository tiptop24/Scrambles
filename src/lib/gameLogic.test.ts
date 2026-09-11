import { describe, it, expect } from "vitest";
import {
  getAvailableTeams,
  validatePick,
  processGameWeekResults,
  findPlayersMissingPick,
  computeStandings,
  type PickData,
  type PlayerData,
  type FixtureData,
  type TeamRef,
} from "./gameLogic";

const teams: TeamRef[] = [
  { id: "ars", name: "Arsenal" },
  { id: "che", name: "Chelsea" },
  { id: "liv", name: "Liverpool" },
];

function pick(overrides: Partial<PickData>): PickData {
  return {
    id: "p1",
    playerId: "player-1",
    gameWeekId: "gw1",
    teamId: "ars",
    result: "PENDING",
    goalDifference: 0,
    ...overrides,
  };
}

function player(overrides: Partial<PlayerData>): PlayerData {
  return {
    id: "player-1",
    name: "Alex",
    eliminated: false,
    eliminatedWeekNo: null,
    ...overrides,
  };
}

function fixture(overrides: Partial<FixtureData>): FixtureData {
  return {
    id: "f1",
    gameWeekId: "gw1",
    homeTeamId: "ars",
    awayTeamId: "che",
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
    ...overrides,
  };
}

describe("getAvailableTeams", () => {
  it("excludes teams the player has already picked, ever", () => {
    const picks = [pick({ teamId: "ars", gameWeekId: "gw1" })];
    const available = getAvailableTeams(teams, picks, "player-1");
    expect(available.map((t) => t.id)).toEqual(["che", "liv"]);
  });

  it("does not exclude teams picked by other players", () => {
    const picks = [pick({ playerId: "player-2", teamId: "ars" })];
    const available = getAvailableTeams(teams, picks, "player-1");
    expect(available.map((t) => t.id)).toEqual(["ars", "che", "liv"]);
  });
});

describe("validatePick", () => {
  const baseInput = {
    player: player({}),
    gameWeek: { locked: false },
    teamId: "liv",
    existingPicksForPlayer: [] as PickData[],
    existingPickForThisWeek: undefined,
    fixturesForGameWeek: [fixture({ homeTeamId: "liv", awayTeamId: "che" })],
  };

  it("accepts a valid pick", () => {
    expect(validatePick(baseInput)).toEqual({ ok: true });
  });

  it("rejects an eliminated player", () => {
    const result = validatePick({ ...baseInput, player: player({ eliminated: true }) });
    expect(result.ok).toBe(false);
  });

  it("rejects picks once the gameweek is locked", () => {
    const result = validatePick({ ...baseInput, gameWeek: { locked: true } });
    expect(result.ok).toBe(false);
  });

  it("rejects a second pick in the same gameweek", () => {
    const result = validatePick({
      ...baseInput,
      existingPickForThisWeek: pick({ teamId: "ars" }),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a team the player already used in an earlier gameweek", () => {
    const result = validatePick({
      ...baseInput,
      existingPicksForPlayer: [pick({ teamId: "liv", gameWeekId: "gw0" })],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a team that isn't playing this gameweek", () => {
    const result = validatePick({
      ...baseInput,
      teamId: "ars",
      fixturesForGameWeek: [fixture({ homeTeamId: "liv", awayTeamId: "che" })],
    });
    expect(result.ok).toBe(false);
  });
});

describe("processGameWeekResults", () => {
  it("scores a win with positive goal difference for the home pick", () => {
    const fixtures = [fixture({ homeTeamId: "ars", awayTeamId: "che", status: "FINAL", homeScore: 3, awayScore: 1 })];
    const [outcome] = processGameWeekResults([pick({ teamId: "ars" })], fixtures);
    expect(outcome).toMatchObject({ result: "WIN", goalDifference: 2, eliminated: false });
  });

  it("scores a loss with negative goal difference for the away pick", () => {
    const fixtures = [fixture({ homeTeamId: "ars", awayTeamId: "che", status: "FINAL", homeScore: 3, awayScore: 1 })];
    const [outcome] = processGameWeekResults([pick({ teamId: "che" })], fixtures);
    expect(outcome).toMatchObject({ result: "LOSS", goalDifference: -2, eliminated: true });
  });

  it("eliminates on a draw even though goal difference is zero", () => {
    const fixtures = [fixture({ homeTeamId: "ars", awayTeamId: "che", status: "FINAL", homeScore: 1, awayScore: 1 })];
    const [outcome] = processGameWeekResults([pick({ teamId: "ars" })], fixtures);
    expect(outcome).toMatchObject({ result: "DRAW", goalDifference: 0, eliminated: true });
  });

  it("throws rather than scoring a fixture that isn't final", () => {
    const fixtures = [fixture({ homeTeamId: "ars", awayTeamId: "che", status: "SCHEDULED" })];
    expect(() => processGameWeekResults([pick({ teamId: "ars" })], fixtures)).toThrow();
  });
});

describe("findPlayersMissingPick", () => {
  it("flags an alive player with no pick for the week, ignores eliminated players", () => {
    const alive = [player({ id: "p1" }), player({ id: "p2" })];
    const eliminatedButPassedIn = player({ id: "p3", eliminated: true });
    const picksForWeek = [pick({ playerId: "p1" })];
    const missing = findPlayersMissingPick([...alive, eliminatedButPassedIn], picksForWeek);
    expect(missing.map((p) => p.id)).toEqual(["p2"]);
  });
});

describe("computeStandings", () => {
  it("ranks every alive player above every eliminated player", () => {
    const players = [
      player({ id: "alive-low-gd", eliminated: false }),
      player({ id: "eliminated-high-gd", eliminated: true, eliminatedWeekNo: 5 }),
    ];
    const picks = [
      pick({ id: "p1", playerId: "alive-low-gd", result: "WIN", goalDifference: 1 }),
      pick({ id: "p2", playerId: "eliminated-high-gd", result: "LOSS", goalDifference: 10 }),
    ];
    const standings = computeStandings(players, picks);
    expect(standings.map((r) => r.playerId)).toEqual(["alive-low-gd", "eliminated-high-gd"]);
  });

  it("breaks ties between equally-alive players by cumulative goal difference", () => {
    const players = [player({ id: "big-gd" }), player({ id: "small-gd" })];
    const picks = [
      pick({ id: "p1", playerId: "big-gd", gameWeekId: "gw1", result: "WIN", goalDifference: 3 }),
      pick({ id: "p2", playerId: "small-gd", gameWeekId: "gw1", result: "WIN", goalDifference: 1 }),
    ];
    const standings = computeStandings(players, picks);
    expect(standings.map((r) => r.playerId)).toEqual(["big-gd", "small-gd"]);
    expect(standings[0].cumulativeGoalDifference).toBe(3);
  });

  it("ranks eliminated players by weeks survived first, then goal difference", () => {
    const players = [
      player({ id: "survived-longer", eliminated: true, eliminatedWeekNo: 4 }),
      player({ id: "survived-shorter-big-gd", eliminated: true, eliminatedWeekNo: 2 }),
    ];
    const picks = [
      pick({ id: "p1", playerId: "survived-longer", gameWeekId: "gw1", result: "WIN", goalDifference: 1 }),
      pick({ id: "p2", playerId: "survived-longer", gameWeekId: "gw2", result: "WIN", goalDifference: 1 }),
      pick({ id: "p3", playerId: "survived-longer", gameWeekId: "gw3", result: "LOSS", goalDifference: -1 }),
      pick({ id: "p4", playerId: "survived-shorter-big-gd", gameWeekId: "gw1", result: "WIN", goalDifference: 9 }),
      pick({ id: "p5", playerId: "survived-shorter-big-gd", gameWeekId: "gw2", result: "DRAW", goalDifference: 0 }),
    ];
    const standings = computeStandings(players, picks);
    expect(standings.map((r) => r.playerId)).toEqual(["survived-longer", "survived-shorter-big-gd"]);
  });

  it("sums goal difference only from scored picks, ignoring pending ones", () => {
    const players = [player({ id: "p1" })];
    const picks = [
      pick({ id: "a", playerId: "p1", gameWeekId: "gw1", result: "WIN", goalDifference: 2 }),
      pick({ id: "b", playerId: "p1", gameWeekId: "gw2", result: "PENDING", goalDifference: 0 }),
    ];
    const [row] = computeStandings(players, picks);
    expect(row.cumulativeGoalDifference).toBe(2);
    expect(row.weeksSurvived).toBe(1);
  });
});
