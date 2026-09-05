import { BAR_COUNT } from "./recorder";

function base64ToBlob(base64: string, mimeType = "audio/mpeg"): Blob {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mimeType });
}

/**
 * Plays TTS replies and exposes live playback levels (one 0-1 value per
 * waveform bar) for a reactive visual. iOS Safari only allows an <audio>
 * element to be played programmatically if it was already played (even
 * silently) as a direct result of a user gesture. By the time our real
 * reply comes back from a network round-trip, that gesture has expired --
 * the fix is to create and silently play-then-pause this same element/
 * AudioContext during the *original* tap (see unlock()), then only ever
 * change its `src` and call `.play()` again later -- iOS treats a
 * previously-unlocked element as still allowed to play programmatically
 * after that.
 */
export class VoicePlayer {
  private audioEl: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private unlocked = false;
  private cleanupCurrent: (() => void) | null = null;

  constructor() {
    this.audioEl = new Audio();
  }

  /** Call synchronously from inside a click/tap handler, before any await. */
  unlock(): void {
    if (this.unlocked) {
      if (this.audioContext?.state === "suspended") this.audioContext.resume();
      return;
    }
    this.unlocked = true;

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaElementSource(this.audioEl);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 64;
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.audioEl.muted = true;
    const attempt = this.audioEl.play();
    if (attempt) {
      attempt
        .then(() => {
          this.audioEl.pause();
          this.audioEl.muted = false;
        })
        .catch(() => {
          this.audioEl.muted = false;
        });
    }
  }

  playBase64(base64: string, onLevels: (levels: number[]) => void): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(base64ToBlob(base64));

      if (this.audioContext?.state === "suspended") {
        this.audioContext.resume();
      }

      const analyser = this.analyser;
      const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
      const step = freqData ? Math.max(1, Math.floor(freqData.length / BAR_COUNT)) : 1;
      let rafId: number | null = null;

      const tick = () => {
        if (!analyser || !freqData) return;
        analyser.getByteFrequencyData(freqData);
        const levels: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          levels.push(freqData[i * step] / 255);
        }
        onLevels(levels);
        rafId = requestAnimationFrame(tick);
      };

      const cleanup = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        onLevels(new Array(BAR_COUNT).fill(0));
        URL.revokeObjectURL(url);
        resolve();
      };

      this.cleanupCurrent = cleanup;
      this.audioEl.onended = cleanup;
      this.audioEl.onerror = cleanup;
      this.audioEl.src = url;
      this.audioEl.play().then(tick).catch(cleanup);
    });
  }

  /** Stops in-progress playback immediately (the "tap to interrupt" control). */
  interrupt(): void {
    if (!this.audioEl.paused) this.audioEl.pause();
    this.cleanupCurrent?.();
    this.cleanupCurrent = null;
  }
}
