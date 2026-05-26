import {
  FormEvent,
  PointerEvent,
  TouchEvent as ReactTouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createSpeaker } from "./lib/speech";
import { incrementWordStat, loadPracticeStats, savePracticeStats } from "./lib/practiceStats";
import { filterWords, loadLibrary, saveLibrary } from "./lib/storage";
import type { WordCard, WordLibrary } from "./types";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape" | "landscape-primary") => Promise<void>;
};

const ALL_WORDS = "all";
const SPEECH_COOLDOWN_KEY = "toddler-words-speech-cooldown-seconds";
const SPEECH_ENABLED_KEY = "toddler-words-speech-enabled";
const HIDE_FAVORITES_KEY = "toddler-words-hide-favorites";
const categoryThemeClass: Record<string, string> = {
  animals: "theme-animals",
  colors: "theme-colors",
  construction: "theme-construction",
  food: "theme-food",
  vehicles: "theme-vehicles",
  shows: "theme-shows",
  nature: "theme-nature",
  places: "theme-places",
  home: "theme-home"
};
const NEW_WORD: Omit<WordCard, "id"> = {
  text: "",
  categories: ["sight words"],
  favorite: false,
  speechText: ""
};

function createId(text: string) {
  return `${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function loadSpeechCooldownSeconds() {
  const stored = window.localStorage.getItem(SPEECH_COOLDOWN_KEY);
  const parsed = stored ? Number(stored) : 3;
  return Number.isFinite(parsed) ? Math.max(0, Math.min(30, parsed)) : 3;
}

function loadHideFavorites() {
  return window.localStorage.getItem(HIDE_FAVORITES_KEY) !== "false";
}

function loadSpeechEnabled() {
  return window.localStorage.getItem(SPEECH_ENABLED_KEY) !== "false";
}

export default function App() {
  const [library, setLibrary] = useState<WordLibrary>(() => loadLibrary());
  const [category, setCategory] = useState(ALL_WORDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uppercase, setUppercase] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [hideFavorites, setHideFavorites] = useState(loadHideFavorites);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speechNotice, setSpeechNotice] = useState("");
  const [speechEnabled, setSpeechEnabled] = useState(loadSpeechEnabled);
  const [speechCooldownSeconds, setSpeechCooldownSeconds] = useState(loadSpeechCooldownSeconds);
  const [speechAvailableAt, setSpeechAvailableAt] = useState(0);
  const [clockTime, setClockTime] = useState(Date.now());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installStatus, setInstallStatus] = useState("Open the HTTPS preview in Chrome to install.");
  const [manageWordsOpen, setManageWordsOpen] = useState(false);
  const [cardMotion, setCardMotion] = useState<"next" | "previous" | "">("");
  const [practiceStats, setPracticeStats] = useState(() => loadPracticeStats());
  const [wordEditorOpen, setWordEditorOpen] = useState(false);
  const [wordSearch, setWordSearch] = useState("");
  const [draft, setDraft] = useState<Omit<WordCard, "id">>(NEW_WORD);
  const [editingId, setEditingId] = useState<string | null>(null);
  const speaker = useMemo(() => createSpeaker(), []);
  const pressTimer = useRef<number | null>(null);
  const pointerStart = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const settingsPanelRef = useRef<HTMLElement | null>(null);
  const wordFormRef = useRef<HTMLFormElement | null>(null);
  const wordInputRef = useRef<HTMLInputElement | null>(null);

  const visibleWords = useMemo(() => {
    const filtered = filterWords(library.words, category, favoritesOnly);
    return shuffleMode ? shuffle(filtered) : filtered;
  }, [category, favoritesOnly, library.words, shuffleMode]);

  const managedWords = useMemo(() => {
    const query = wordSearch.trim().toLowerCase();

    if (!query) {
      return library.words;
    }

    return library.words.filter((word) => {
      return (
        word.text.includes(query) ||
        word.categories.some((name) => name.includes(query)) ||
        word.speechText?.includes(query)
      );
    });
  }, [library.words, wordSearch]);

  const currentWord = visibleWords[currentIndex] ?? visibleWords[0];
  const spokenText = currentWord?.speechText || currentWord?.text;
  const displayedText = currentWord ? (uppercase ? currentWord.text.toUpperCase() : currentWord.text) : "add words";
  const wordLengthClass =
    displayedText.length > 16 ? "long-word" : displayedText.length > 9 ? "medium-word" : "short-word";
  const cardThemeClass =
    currentWord?.categories.map((name) => categoryThemeClass[name]).find(Boolean) ?? "theme-default";
  const speechRemainingMs = Math.max(0, speechAvailableAt - clockTime);
  const speechRemainingSeconds = Math.ceil(speechRemainingMs / 1000);
  const canSpeak = speechRemainingMs === 0;
  const speechWaitProgress =
    canSpeak || speechCooldownSeconds === 0
      ? 1
      : Math.max(
          0,
          Math.min(
            1,
            (speechCooldownSeconds * 1000 - speechRemainingMs) / (speechCooldownSeconds * 1000)
          )
        );

  useEffect(() => {
    saveLibrary(library);
  }, [library]);

  useEffect(() => {
    savePracticeStats(practiceStats);
  }, [practiceStats]);

  useEffect(() => {
    window.localStorage.setItem(SPEECH_COOLDOWN_KEY, String(speechCooldownSeconds));
  }, [speechCooldownSeconds]);

  useEffect(() => {
    window.localStorage.setItem(SPEECH_ENABLED_KEY, String(speechEnabled));
    speaker.cancel();
  }, [speaker, speechEnabled]);

  useEffect(() => {
    window.localStorage.setItem(HIDE_FAVORITES_KEY, String(hideFavorites));

    if (hideFavorites) {
      setFavoritesOnly(false);
    }
  }, [hideFavorites]);

  useEffect(() => {
    if (speechAvailableAt <= Date.now()) {
      return;
    }

    const timer = window.setInterval(() => setClockTime(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [speechAvailableAt]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallStatus("Ready to install.");
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallStatus("Installed.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstallStatus("Running as an installed app.");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches) {
      return;
    }

    const orientation = window.screen.orientation as LockableScreenOrientation | undefined;

    orientation?.lock?.("landscape-primary").catch(() => {
      orientation?.lock?.("landscape").catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    const preventPinchZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const preventDoubleTapZoom = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("touchmove", preventPinchZoom, { passive: false });
    document.addEventListener("dblclick", preventDoubleTapZoom);

    return () => {
      document.removeEventListener("touchmove", preventPinchZoom);
      document.removeEventListener("dblclick", preventDoubleTapZoom);
    };
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [category, favoritesOnly, shuffleMode]);

  useEffect(() => {
    if (currentIndex >= visibleWords.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, visibleWords.length]);

  useEffect(() => {
    if (!cardMotion) {
      return;
    }

    const timer = window.setTimeout(() => setCardMotion(""), 260);
    return () => window.clearTimeout(timer);
  }, [cardMotion, currentWord?.id]);

  useEffect(() => {
    const now = Date.now();
    setClockTime(now);
    setSpeechAvailableAt(speechCooldownSeconds > 0 ? now + speechCooldownSeconds * 1000 : 0);
  }, [currentWord?.id, speechCooldownSeconds]);

  useEffect(() => {
    if (!currentWord?.id) {
      return;
    }

    setPracticeStats((current) => incrementWordStat(current, currentWord.id, "seen"));
  }, [currentWord?.id]);

  function speakCurrent() {
    if (!speechEnabled || !spokenText) {
      return;
    }

    if (!canSpeak) {
      return;
    }

    const didSpeak = speaker.speak(spokenText);
    setSpeechNotice(didSpeak ? "" : "Speech is not available in this browser.");

    if (didSpeak && speechCooldownSeconds > 0) {
      const nextAvailableAt = Date.now() + speechCooldownSeconds * 1000;
      setClockTime(Date.now());
      setSpeechAvailableAt(nextAvailableAt);
    }

    if (didSpeak && currentWord?.id) {
      setPracticeStats((current) => incrementWordStat(current, currentWord.id, "heard"));
    }
  }

  function nextWord() {
    if (visibleWords.length === 0) {
      return;
    }
    setCardMotion("next");
    setCurrentIndex((index) => (index + 1) % visibleWords.length);
  }

  function previousWord() {
    if (visibleWords.length === 0) {
      return;
    }
    setCardMotion("previous");
    setCurrentIndex((index) => (index - 1 + visibleWords.length) % visibleWords.length);
  }

  function handleCardPointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStart.current = event.clientX;
  }

  function handleCardPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;

    if (start === null) {
      return;
    }

    const distance = event.clientX - start;

    if (Math.abs(distance) > 50) {
      distance < 0 ? nextWord() : previousWord();
      return;
    }

    speakCurrent();
  }

  function handleCardTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleCardTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;

    if (!start || !touch) {
      return;
    }

    const distanceX = touch.clientX - start.x;
    const distanceY = touch.clientY - start.y;

    if (Math.abs(distanceX) > 36 && Math.abs(distanceX) > Math.abs(distanceY) * 1.25) {
      event.preventDefault();
      distanceX < 0 ? nextWord() : previousWord();
    }
  }

  function beginSettingsPress() {
    pressTimer.current = window.setTimeout(() => {
      setSettingsOpen(true);
      setManageWordsOpen(false);
      pressTimer.current = null;
    }, 1100);
  }

  function endSettingsPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function saveDraft(event: FormEvent) {
    event.preventDefault();
    const text = draft.text.trim().toLowerCase();
    const categories = draft.categories.length > 0 ? draft.categories : [library.categories[0]];

    if (!text) {
      return;
    }

    setLibrary((current) => {
      const word: WordCard = {
        id: editingId ?? createId(text),
        text,
        categories,
        favorite: draft.favorite,
        speechText: draft.speechText?.trim().toLowerCase() || undefined
      };

      return {
        ...current,
        words: editingId
          ? current.words.map((item) => (item.id === editingId ? word : item))
          : [...current.words, word]
      };
    });
    setDraft(NEW_WORD);
    setEditingId(null);
    setWordEditorOpen(false);
  }

  function editWord(word: WordCard) {
    setEditingId(word.id);
    setWordEditorOpen(true);
    setDraft({
      text: word.text,
      categories: word.categories,
      favorite: word.favorite,
      speechText: word.speechText ?? ""
    });
    window.requestAnimationFrame(() => {
      settingsPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      wordFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      wordInputRef.current?.focus();
    });
  }

  function deleteWord(id: string) {
    setLibrary((current) => ({ ...current, words: current.words.filter((word) => word.id !== id) }));
  }

  function startAddingWord() {
    setEditingId(null);
    setDraft(NEW_WORD);
    setWordEditorOpen(true);
    window.requestAnimationFrame(() => {
      settingsPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      wordInputRef.current?.focus();
    });
  }

  function toggleDraftCategory(categoryName: string) {
    setDraft((current) => {
      const hasCategory = current.categories.includes(categoryName);
      return {
        ...current,
        categories: hasCategory
          ? current.categories.filter((name) => name !== categoryName)
          : [...current.categories, categoryName]
      };
    });
  }

  function addCategory() {
    const name = window.prompt("New category name")?.trim().toLowerCase();

    if (!name || library.categories.includes(name)) {
      return;
    }

    setLibrary((current) => ({ ...current, categories: [...current.categories, name] }));
    setDraft((current) => ({ ...current, categories: [...current.categories, name] }));
  }

  async function installApp() {
    if (!installPrompt) {
      setInstallStatus("Install is not available yet. Reload the HTTPS preview, then wait a few seconds.");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallStatus(choice.outcome === "accepted" ? "Installing." : "Install dismissed.");
  }

  function testDraftSpeech() {
    const text = draft.speechText?.trim() || draft.text.trim();

    if (!text) {
      return;
    }

    const didSpeak = speaker.speak(text);
    setSpeechNotice(didSpeak ? "" : "Speech is not available in this browser.");
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <button
          className="gear-button"
          aria-label="Hold to open parent settings"
          onPointerDown={beginSettingsPress}
          onPointerUp={endSettingsPress}
          onPointerCancel={endSettingsPress}
          onPointerLeave={endSettingsPress}
        >
          ⚙
        </button>
      </header>

      <section className="card-stage" aria-live="polite">
        <button
          className="nav-button left"
          type="button"
          aria-label="Previous word"
          onClick={previousWord}
        >
          ‹
        </button>

        <div
          className={`word-card ${cardThemeClass} ${wordLengthClass} ${canSpeak ? "ready" : "cooling"} ${
            cardMotion ? `motion-${cardMotion}` : ""
          }`}
          role="button"
          tabIndex={0}
          onPointerDown={handleCardPointerDown}
          onPointerUp={handleCardPointerUp}
          onTouchStart={handleCardTouchStart}
          onTouchEnd={handleCardTouchEnd}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              speakCurrent();
            }
          }}
          aria-label={
            !speechEnabled
              ? displayedText
              : canSpeak
                ? `Speak ${displayedText}`
                : `Speech ready in ${speechRemainingSeconds} seconds`
          }
        >
          <button
            className="gear-button in-card"
            type="button"
            aria-label="Hold to open parent settings"
            onPointerDown={(event) => {
              event.stopPropagation();
              beginSettingsPress();
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              endSettingsPress();
            }}
            onPointerCancel={(event) => {
              event.stopPropagation();
              endSettingsPress();
            }}
            onPointerLeave={(event) => {
              event.stopPropagation();
              endSettingsPress();
            }}
            onTouchStart={(event) => event.stopPropagation()}
            onTouchEnd={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            ⚙
          </button>
          <span className="progress in-card">
            {visibleWords.length === 0 ? "0 / 0" : `${currentIndex + 1} / ${visibleWords.length}`}
          </span>
          {speechEnabled ? (
            <span className="speech-indicator" aria-hidden="true">
              {canSpeak ? (
                <svg className="sound-icon" viewBox="0 0 40 40" role="img" aria-label="Ready to read">
                  <path d="M7 16.5h7.5L24 8.5v23l-9.5-8H7z" />
                  <path d="M28.5 14.2c2.7 3.4 2.7 8.2 0 11.6" />
                  <path d="M32.7 10.4c4.9 5.8 4.9 13.4 0 19.2" />
                </svg>
              ) : null}
              {!canSpeak ? (
                <span
                  className="wait-ring"
                  style={{ "--wait-progress": `${Math.round(speechWaitProgress * 100)}%` } as React.CSSProperties}
                />
              ) : null}
            </span>
          ) : null}
          <span className={`word-text ${wordLengthClass}`}>{displayedText}</span>
        </div>

        <button className="nav-button right" type="button" aria-label="Next word" onClick={nextWord}>
          ›
        </button>
      </section>

      {speechNotice ? <p className="notice">{speechNotice}</p> : null}

      {settingsOpen ? (
        <div className="settings-backdrop" role="dialog" aria-modal="true" aria-label="Parent settings">
          <section className={`settings-panel ${manageWordsOpen ? "word-manager-open" : ""}`} ref={settingsPanelRef}>
            <header>
              <h1>{manageWordsOpen ? "Manage Words" : "Parent Settings"}</h1>
              <div className="settings-actions">
                {manageWordsOpen ? (
                  <button type="button" onClick={() => setManageWordsOpen(false)}>
                    back
                  </button>
                ) : null}
                <button type="button" onClick={() => setSettingsOpen(false)}>
                  done
                </button>
              </div>
            </header>

            {!manageWordsOpen ? (
              <>
                {installPrompt ? (
                  <section className="install-panel" aria-label="Install app">
                    <div>
                      <strong>Install</strong>
                      <span>{installStatus}</span>
                    </div>
                    <button type="button" onClick={installApp}>
                      install app
                    </button>
                  </section>
                ) : null}

                <section className="parent-options" aria-label="Learning options">
                  <label className="select-option">
                    word set
                    <select
                      aria-label="Choose category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      <option value={ALL_WORDS}>all words</option>
                      {library.categories.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <input type="checkbox" checked={uppercase} onChange={(event) => setUppercase(event.target.checked)} />
                    uppercase cards
                  </label>
                  <label>
                    <input type="checkbox" checked={shuffleMode} onChange={(event) => setShuffleMode(event.target.checked)} />
                    shuffle words
                  </label>
                  {!hideFavorites ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={favoritesOnly}
                        onChange={(event) => setFavoritesOnly(event.target.checked)}
                      />
                      favorites only
                    </label>
                  ) : null}
                  <label>
                    <input
                      type="checkbox"
                      checked={hideFavorites}
                      onChange={(event) => setHideFavorites(event.target.checked)}
                    />
                    hide favorites
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={speechEnabled}
                      onChange={(event) => setSpeechEnabled(event.target.checked)}
                    />
                    enable speech
                  </label>
                  <label className={`number-option ${!speechEnabled ? "disabled-option" : ""}`}>
                    speech wait
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={speechCooldownSeconds}
                      disabled={!speechEnabled}
                      onChange={(event) => setSpeechCooldownSeconds(Number(event.target.value))}
                    />
                    sec
                  </label>
                </section>

                <button type="button" className="manage-words-button" onClick={() => setManageWordsOpen(true)}>
                  manage words
                </button>
              </>
            ) : (
              <>
                <div className="word-manager-tools">
                  <button type="button" className="manage-words-button" onClick={startAddingWord}>
                    add word
                  </button>
                  <label className="word-search">
                    Search words
                    <input
                      value={wordSearch}
                      onChange={(event) => setWordSearch(event.target.value)}
                      placeholder="search word or category"
                    />
                  </label>
                </div>

                {wordEditorOpen ? (
                  <form className="word-form editor-card" onSubmit={saveDraft} ref={wordFormRef}>
                    <div className="form-status">
                      {editingId ? "Editing selected word" : "Adding a new word"}
                      <button
                        type="button"
                        onClick={() => {
                          setWordEditorOpen(false);
                          setEditingId(null);
                          setDraft(NEW_WORD);
                        }}
                      >
                        close
                      </button>
                    </div>
                    <label>
                      Word or phrase
                      <input
                        ref={wordInputRef}
                        value={draft.text}
                        onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
                        placeholder="type a word, like moon"
                      />
                    </label>
                    <label className="pronunciation-field">
                      Pronunciation override
                      <div className="pronunciation-row">
                        <input
                          value={draft.speechText ?? ""}
                          onChange={(event) => setDraft((current) => ({ ...current, speechText: event.target.value }))}
                          placeholder="optional"
                        />
                        <button type="button" onClick={testDraftSpeech} disabled={!draft.text.trim() && !draft.speechText?.trim()}>
                          test
                        </button>
                      </div>
                      <span>Leave blank unless the voice says the word wrong.</span>
                    </label>
                    <div className="category-editor">
                      <div>
                        <strong>Categories</strong>
                        <button type="button" onClick={addCategory}>
                          add
                        </button>
                      </div>
                      <div className="category-chips">
                        {library.categories.map((name) => (
                          <label key={name}>
                            <input
                              type="checkbox"
                              checked={draft.categories.includes(name)}
                              onChange={() => toggleDraftCategory(name)}
                            />
                            {name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="favorite-toggle">
                      <input
                        type="checkbox"
                        checked={draft.favorite}
                        onChange={(event) => setDraft((current) => ({ ...current, favorite: event.target.checked }))}
                      />
                      favorite word
                    </label>
                    <button type="submit">{editingId ? "save word" : "add word"}</button>
                  </form>
                ) : null}

                <div className="word-list">
                  {managedWords.map((word) => (
                    <article key={word.id} className={editingId === word.id ? "editing" : ""}>
                      <div>
                        <strong>{word.text}</strong>
                        <span>{word.categories.join(", ")}</span>
                        <span className="practice-stats">
                          seen {practiceStats[word.id]?.seen ?? 0} · heard {practiceStats[word.id]?.heard ?? 0}
                        </span>
                      </div>
                      <button type="button" onClick={() => editWord(word)}>
                        edit
                      </button>
                      <button type="button" onClick={() => deleteWord(word.id)}>
                        delete
                      </button>
                    </article>
                  ))}
                  {managedWords.length === 0 ? <p className="empty-search">No words match that search.</p> : null}
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
