import { describe, it, expect } from "vitest";
import { computeRanks, type RankableEntry } from "./rank-predictions";

interface NamedEntry extends RankableEntry {
  name: string;
}

function entry(name: string, score: number, exactBonusCount: number): NamedEntry {
  return { name, score, exactBonusCount };
}

describe("computeRanks", () => {
  it("returns an empty list for no entries", () => {
    expect(computeRanks([])).toEqual([]);
  });

  it("ranks a single entry as #1", () => {
    const result = computeRanks([entry("A", 50, 2)]);
    expect(result).toEqual([{ name: "A", score: 50, exactBonusCount: 2, rank: 1 }]);
  });

  it("ranks distinct scores in descending order, 1/2/3", () => {
    const result = computeRanks([entry("A", 10, 0), entry("B", 30, 0), entry("C", 20, 0)]);
    expect(result.map((e) => [e.name, e.rank])).toEqual([
      ["B", 1],
      ["C", 2],
      ["A", 3],
    ]);
  });

  it("breaks a score tie using exactBonusCount (more exact-position bonuses wins)", () => {
    const result = computeRanks([entry("A", 50, 1), entry("B", 50, 3), entry("C", 50, 2)]);
    expect(result.map((e) => [e.name, e.rank])).toEqual([
      ["B", 1],
      ["C", 2],
      ["A", 3],
    ]);
  });

  it("shows a true tie (same score and same exactBonusCount) as the same rank, skipping the next rank", () => {
    const result = computeRanks([entry("A", 40, 2), entry("B", 40, 2), entry("C", 30, 0)]);
    // Standard competition ranking: 1, 1, 3 — not 1, 1, 2.
    expect(result.map((e) => [e.name, e.rank])).toEqual([
      ["A", 1],
      ["B", 1],
      ["C", 3],
    ]);
  });

  it("handles multiple separate tie groups with a distinct entry in between", () => {
    const result = computeRanks([
      entry("A", 40, 1),
      entry("B", 40, 1),
      entry("C", 30, 0),
      entry("D", 20, 5),
      entry("E", 20, 5),
    ]);
    expect(result.map((e) => [e.name, e.rank])).toEqual([
      ["A", 1],
      ["B", 1],
      ["C", 3],
      ["D", 4],
      ["E", 4],
    ]);
  });

  it("does not mutate the input array order", () => {
    const input = [entry("A", 10, 0), entry("B", 30, 0)];
    computeRanks(input);
    expect(input.map((e) => e.name)).toEqual(["A", "B"]);
  });
});
