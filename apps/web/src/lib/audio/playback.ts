function base64ToBlob(base64: string, mimeType = "audio/mpeg"): Blob {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mimeType });
}

/**
 * Plays TTS replies and exposes live playback amplitude for a reactive
 * visual. iOS Safari only allows an <audio> element to be played
 * programmatically if playback started (or was "unlocked") synchronously
 * within a user gesture -- by the time our real reply comes back from a
 * network round-trip, that gesture has expired. The fix is to create and
 * silently play-then-pause this same element/AudioContext during the
 * *original* tap (see unlock()), then only ever change its `src` and call
 * `.play()` again later -- iOS treats a previously-unlocked element as
 * still allowed to play programmatically after that.
 */
export class VoicePlayer {
  private audioEl: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private unlocked = false;

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
    this.analyser.fftSize = 256;
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

  playBase64(base64: string, onAmplitude: (level: number) => void): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(base64ToBlob(base64));

      if (this.audioContext?.state === "suspended") {
        this.audioContext.resume();
      }

      const analyser = this.analyser;
      const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
      let rafId: number | null = null;

      const tick = () => {
        if (!analyser || !data) return;
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const centered = (data[i] - 128) / 128;
          sumSquares += centered * centered;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        onAmplitude(Math.min(rms * 4, 1));
        rafId = requestAnimationFrame(tick);
      };

      const cleanup = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        onAmplitude(0);
        URL.revokeObjectURL(url);
        resolve();
      };

      this.audioEl.onended = cleanup;
      this.audioEl.onerror = cleanup;
      this.audioEl.src = url;
      this.audioEl.play().then(tick).catch(cleanup);
    });
  }
}
