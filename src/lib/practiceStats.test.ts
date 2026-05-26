import { beforeEach, describe, expect, it } from "vitest";
import {
  PRACTICE_STATS_KEY,
  incrementWordStat,
  loadPracticeStats,
  savePracticeStats
} from "./practiceStats";

describe("practice stats", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists word seen and heard counts", () => {
    savePracticeStats({ cat: { seen: 2, heard: 1 } });

    expect(JSON.parse(localStorage.getItem(PRACTICE_STATS_KEY) ?? "{}")).toEqual({
      cat: { seen: 2, heard: 1 }
    });
    expect(loadPracticeStats()).toEqual({ cat: { seen: 2, heard: 1 } });
  });

  it("increments a missing stat from zero", () => {
    expect(incrementWordStat({}, "cat", "seen")).toEqual({
      cat: { seen: 1, heard: 0 }
    });
  });

  it("increments only the requested stat", () => {
    expect(incrementWordStat({ cat: { seen: 3, heard: 2 } }, "cat", "heard")).toEqual({
      cat: { seen: 3, heard: 3 }
    });
  });
});
