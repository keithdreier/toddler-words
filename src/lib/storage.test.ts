import { describe, expect, it, beforeEach } from "vitest";
import { WORD_LIBRARY_KEY, filterWords, loadLibrary, saveLibrary } from "./storage";
import type { WordLibrary } from "../types";

const sampleLibrary: WordLibrary = {
  categories: ["animals", "colors"],
  words: [
    { id: "1", text: "cat", categories: ["animals"], favorite: true },
    { id: "2", text: "red", categories: ["colors"], favorite: false }
  ]
};

describe("word library persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads starter data when storage is empty", () => {
    const library = loadLibrary();

    expect(library.categories).toContain("animals");
    expect(library.words.some((word) => word.text === "cat")).toBe(true);
  });

  it("saves and reloads custom words from localStorage", () => {
    saveLibrary(sampleLibrary);

    expect(JSON.parse(localStorage.getItem(WORD_LIBRARY_KEY) ?? "{}").words).toHaveLength(2);
    expect(loadLibrary()).toEqual(sampleLibrary);
  });
});

describe("category filtering", () => {
  it("filters by category", () => {
    expect(filterWords(sampleLibrary.words, "animals", false).map((word) => word.text)).toEqual(["cat"]);
  });

  it("can show favorites only", () => {
    expect(filterWords(sampleLibrary.words, "all", true).map((word) => word.text)).toEqual(["cat"]);
  });
});
