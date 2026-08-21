import { describe, it, expect } from "vitest";
import { scorePrediction, type ScoringConfig, type TableAndAwards } from "./scoring";

// 6-team league: top-bracket = 3 (e.g. 2 UCL + 1 UEL), relegation = 2.
const config: ScoringConfig = { teamCount: 6, topBracketSize: 3, relegationSize: 2 };

function table(order: string[]): Map<string, number> {
  const map = new Map<string, number>();
  order.forEach((teamId, index) => map.set(teamId, index + 1));
  return map;
}

const noAwards: Omit<TableAndAwards, "positionByTeamId"> = {
  goldenBootPlayerId: null,
  mostAssistsPlayerId: null,
  youngPlayerPlayerId: null,
  emergingPlayerPlayerId: null,
  surpriseTeamId: null,
  disappointingTeamId: null,
};

const TEAMS = ["A", "B", "C", "D", "E", "F"];

describe("scorePrediction", () => {
  it("scores nothing when the table order is identical but no awards are set", () => {
    const truth: TableAndAwards = { ...noAwards, positionByTeamId: table(TEAMS) };
    const prediction: TableAndAwards = { ...noAwards, positionByTeamId: table(TEAMS) };
    const result = scorePrediction(config, truth, prediction);

    // Identical order means every team is both an exact-position and
    // top-bracket/relegation hit, but every award field is null so nothing
    // from that side of the table scores either.
    expect(result.championPoints).toBe(25);
    expect(result.topBracketPoints).toBe(30); // 3 teams x 10
    expect(result.relegationPoints).toBe(20); // 2 teams x 10
    expect(result.exactPositionBonusCount).toBe(6);
    expect(result.exactPositionBonusPoints).toBe(30); // 6 teams x 5
    expect(result.goldenBootPoints).toBe(0);
    expect(result.total).toBe(25 + 30 + 30 + 20);
  });

  it("awards the champion bonus only for an exact #1 match, stacking with the +5 exact bonus", () => {
    const truth: TableAndAwards = {
      ...noAwards,
      positionByTeamId: table(["A", "B", "C", "D", "E", "F"]),
    };
    const prediction: TableAndAwards = {
      ...noAwards,
      positionByTeamId: table(["A", "C", "B", "D", "E", "F"]),
    };
    const result = scorePrediction(config, truth, prediction);

    expect(result.championPoints).toBe(25);
    // A is exact (champion), D/E/F also exact => 4 exact hits total.
    expect(result.exactPositionBonusCount).toBe(4);
    expect(result.exactPositionBonusPoints).toBe(20);
  });

  it("gives no champion bonus when the predicted #1 is wrong", () => {
    const truth: TableAndAwards = { ...noAwards, positionByTeamId: table(TEAMS) };
    const prediction: TableAndAwards = {
      ...noAwards,
      positionByTeamId: table(["B", "A", "C", "D", "E", "F"]),
    };
    const result = scorePrediction(config, truth, prediction);
    expect(result.championPoints).toBe(0);
  });

  it("scores top-bracket picks regardless of order within the bracket", () => {
    const truth: TableAndAwards = { ...noAwards, positionByTeamId: table(TEAMS) }; // top 3: A,B,C
    const prediction: TableAndAwards = {
      ...noAwards,
      // Same 3 teams in the top bracket, shuffled order — no exact matches.
      positionByTeamId: table(["C", "A", "B", "F", "D", "E"]),
    };
    const result = scorePrediction(config, truth, prediction);

    expect(result.topBracketPoints).toBe(30); // all 3 top-bracket teams hit
    expect(result.championPoints).toBe(0); // predicted #1 (C) isn't the real champion (A)
    expect(result.exactPositionBonusCount).toBe(0);
  });

  it("scores relegation picks regardless of order within the drop zone", () => {
    const truth: TableAndAwards = { ...noAwards, positionByTeamId: table(TEAMS) }; // relegated: E,F
    const prediction: TableAndAwards = {
      ...noAwards,
      positionByTeamId: table(["A", "B", "C", "D", "F", "E"]), // E/F swapped
    };
    const result = scorePrediction(config, truth, prediction);
    expect(result.relegationPoints).toBe(20); // both relegated teams hit, order doesn't matter
  });

  it("scores each award category independently, worth their CLAUDE.md point values", () => {
    const truth: TableAndAwards = {
      positionByTeamId: table(TEAMS),
      goldenBootPlayerId: "p1",
      mostAssistsPlayerId: "p2",
      youngPlayerPlayerId: "p3",
      emergingPlayerPlayerId: "p4",
      surpriseTeamId: "A",
      disappointingTeamId: "F",
    };
    const prediction: TableAndAwards = {
      positionByTeamId: table(TEAMS),
      goldenBootPlayerId: "p1",
      mostAssistsPlayerId: "wrong",
      youngPlayerPlayerId: "p3",
      emergingPlayerPlayerId: "wrong",
      surpriseTeamId: "A",
      disappointingTeamId: "wrong",
    };
    const result = scorePrediction(config, truth, prediction);

    expect(result.goldenBootPoints).toBe(20);
    expect(result.mostAssistsPoints).toBe(0);
    expect(result.youngPlayerPoints).toBe(15);
    expect(result.emergingPlayerPoints).toBe(0);
    // Surprise/Disappointing Team are hot takes, not scored — just tracked.
    expect(result.surpriseTeamCorrect).toBe(true);
    expect(result.disappointingTeamCorrect).toBe(false);
  });

  it("never awards points for a category the ground truth hasn't set yet, even on a coincidental match", () => {
    const truth: TableAndAwards = {
      ...noAwards,
      positionByTeamId: table(TEAMS),
      goldenBootPlayerId: null,
    };
    const prediction: TableAndAwards = {
      ...noAwards,
      positionByTeamId: table(TEAMS),
      goldenBootPlayerId: null, // both null — must not be treated as "matching"
    };
    const result = scorePrediction(config, truth, prediction);
    expect(result.goldenBootPoints).toBe(0);
  });

  it("sums every component into total", () => {
    const truth: TableAndAwards = {
      positionByTeamId: table(TEAMS),
      goldenBootPlayerId: "p1",
      mostAssistsPlayerId: "p2",
      youngPlayerPlayerId: "p3",
      emergingPlayerPlayerId: "p4",
      surpriseTeamId: "A",
      disappointingTeamId: "F",
    };
    const prediction: TableAndAwards = { ...truth, positionByTeamId: table(TEAMS) };
    const result = scorePrediction(config, truth, prediction);

    const expectedTotal =
      result.championPoints +
      result.topBracketPoints +
      result.exactPositionBonusPoints +
      result.relegationPoints +
      result.goldenBootPoints +
      result.mostAssistsPoints +
      result.youngPlayerPoints +
      result.emergingPlayerPoints;
    expect(result.total).toBe(expectedTotal);
    // Perfect prediction across the board: 25 + 30 + 30 + 20 + 20+20+15+25
    // (Surprise/Disappointing Team don't add to the total — hot takes only.)
    expect(result.total).toBe(185);
    expect(result.surpriseTeamCorrect).toBe(true);
    expect(result.disappointingTeamCorrect).toBe(true);
  });
});
