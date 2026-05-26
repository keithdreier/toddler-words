import { defaultLibrary } from "../data/defaultLibrary";
import type { WordCard, WordLibrary } from "../types";

export const WORD_LIBRARY_KEY = "toddler-words-library-v1";
export const STARTER_WORDS_MIGRATION_KEY = "toddler-words-starter-words-v7";
const retiredStarterWordIds = new Set(["family-mama", "family-dada", "family-nana", "show-dino-dan"]);
const starterPronunciationOverrides = new Map(
  defaultLibrary.words
    .filter((word) => word.speechText)
    .map((word) => [word.id, word.speechText])
);

function cloneDefaultLibrary(): WordLibrary {
  return {
    categories: [...defaultLibrary.categories],
    words: defaultLibrary.words.map((word) => ({ ...word, categories: [...word.categories] }))
  };
}

function normalizeLibrary(value: unknown): WordLibrary {
  const fallback = cloneDefaultLibrary();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<WordLibrary>;
  const categories = Array.isArray(candidate.categories)
    ? candidate.categories.filter((category): category is string => typeof category === "string")
    : fallback.categories;

  const words = Array.isArray(candidate.words)
    ? candidate.words
        .filter((word): word is WordCard => {
          return Boolean(
            word &&
              typeof word === "object" &&
              typeof (word as WordCard).id === "string" &&
              typeof (word as WordCard).text === "string" &&
              Array.isArray((word as WordCard).categories)
          );
        })
        .map((word) => ({
          id: word.id,
          text: word.text.trim().toLowerCase(),
          categories: word.categories.filter((category) => categories.includes(category)),
          favorite: Boolean(word.favorite),
          speechText: typeof word.speechText === "string" ? word.speechText.trim() : undefined
        }))
    : fallback.words;

  return { categories, words: words.length > 0 ? words : fallback.words };
}

function mergeStarterWords(library: WordLibrary): WordLibrary {
  const currentWords = library.words
    .filter((word) => !retiredStarterWordIds.has(word.id))
    .map((word) => {
      const speechText = starterPronunciationOverrides.get(word.id);
      return speechText ? { ...word, speechText } : word;
    });
  const existingIds = new Set(currentWords.map((word) => word.id));
  const newDefaults = defaultLibrary.words.filter((word) => !existingIds.has(word.id));

  if (newDefaults.length === 0 && currentWords.length === library.words.length) {
    return library;
  }

  return {
    categories: Array.from(new Set([...library.categories, ...defaultLibrary.categories])),
    words: [
      ...currentWords,
      ...newDefaults.map((word) => ({ ...word, categories: [...word.categories] }))
    ]
  };
}

export function loadLibrary(storage: Storage = window.localStorage): WordLibrary {
  const stored = storage.getItem(WORD_LIBRARY_KEY);

  if (!stored) {
    return cloneDefaultLibrary();
  }

  try {
    const library = normalizeLibrary(JSON.parse(stored));

    if (storage.getItem(STARTER_WORDS_MIGRATION_KEY) === "done") {
      return library;
    }

    const migrated = mergeStarterWords(library);
    storage.setItem(STARTER_WORDS_MIGRATION_KEY, "done");
    storage.setItem(WORD_LIBRARY_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return cloneDefaultLibrary();
  }
}

export function saveLibrary(library: WordLibrary, storage: Storage = window.localStorage) {
  storage.setItem(WORD_LIBRARY_KEY, JSON.stringify(normalizeLibrary(library)));
  storage.setItem(STARTER_WORDS_MIGRATION_KEY, "done");
}

export function filterWords(words: WordCard[], category: string, favoritesOnly: boolean) {
  return words.filter((word) => {
    const matchesCategory = category === "all" || word.categories.includes(category);
    const matchesFavorite = !favoritesOnly || word.favorite;
    return matchesCategory && matchesFavorite;
  });
}
