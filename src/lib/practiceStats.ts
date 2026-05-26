export type WordPracticeStat = {
  seen: number;
  heard: number;
};

export type PracticeStats = Record<string, WordPracticeStat>;

export const PRACTICE_STATS_KEY = "toddler-words-practice-stats-v1";

export function loadPracticeStats(storage: Storage = window.localStorage): PracticeStats {
  const stored = storage.getItem(PRACTICE_STATS_KEY);

  if (!stored) {
    return {};
  }

  try {
    const parsed = JSON.parse(stored) as PracticeStats;
    return Object.fromEntries(
      Object.entries(parsed).map(([id, stat]) => [
        id,
        {
          seen: Math.max(0, Number(stat.seen) || 0),
          heard: Math.max(0, Number(stat.heard) || 0)
        }
      ])
    );
  } catch {
    return {};
  }
}

export function savePracticeStats(stats: PracticeStats, storage: Storage = window.localStorage) {
  storage.setItem(PRACTICE_STATS_KEY, JSON.stringify(stats));
}

export function incrementWordStat(stats: PracticeStats, wordId: string, key: keyof WordPracticeStat) {
  const current = stats[wordId] ?? { seen: 0, heard: 0 };

  return {
    ...stats,
    [wordId]: {
      ...current,
      [key]: current[key] + 1
    }
  };
}
