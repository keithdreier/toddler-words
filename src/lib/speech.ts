export type SpeakOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
};

type SpeechLike = Pick<SpeechSynthesis, "cancel" | "speak">;

export type Speaker = {
  isSupported: boolean;
  speak: (text: string, options?: SpeakOptions) => boolean;
  cancel: () => void;
};

export function createSpeaker(synth: SpeechLike | undefined = window.speechSynthesis): Speaker {
  const isSupported = Boolean(synth && typeof SpeechSynthesisUtterance !== "undefined");

  return {
    isSupported,
    speak(text, options = {}) {
      const phrase = text.trim().toLowerCase() === "the" ? "thee" : text.trim();

      if (!isSupported || !synth || !phrase) {
        return false;
      }

      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = "en-US";
      utterance.rate = options.rate ?? 0.72;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;
      synth.speak(utterance);
      return true;
    },
    cancel() {
      synth?.cancel();
    }
  };
}
