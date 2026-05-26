import { describe, expect, it, vi } from "vitest";
import { createSpeaker } from "./speech";

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;

  constructor(text: string) {
    this.text = text;
  }
}

describe("speech wrapper", () => {
  it("cancels current speech before speaking slowly", () => {
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    const synth = {
      cancel: vi.fn(),
      speak: vi.fn()
    };

    const speaker = createSpeaker(synth);
    const didSpeak = speaker.speak("cat");

    expect(didSpeak).toBe(true);
    expect(synth.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      synth.speak.mock.invocationCallOrder[0]
    );
    expect(synth.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: "cat", lang: "en-US", rate: 0.72 })
    );
  });

  it("returns false when speech synthesis is unavailable", () => {
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);

    const speaker = createSpeaker(undefined);

    expect(speaker.isSupported).toBe(false);
    expect(speaker.speak("cat")).toBe(false);
  });
});
