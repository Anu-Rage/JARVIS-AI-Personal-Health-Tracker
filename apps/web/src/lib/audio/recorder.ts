export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private rafId: number | null = null;

  async start(onAmplitude: (level: number) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const centered = (data[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      onAmplitude(Math.min(rms * 4, 1));
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  async stop(): Promise<Blob> {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;

    const mediaRecorder = this.mediaRecorder;
    const blob: Blob = await new Promise((resolve) => {
      if (!mediaRecorder) {
        resolve(new Blob());
        return;
      }
      mediaRecorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: mediaRecorder.mimeType || "audio/webm" }));
      };
      mediaRecorder.stop();
    });

    this.stream?.getTracks().forEach((track) => track.stop());
    await this.audioContext?.close();

    this.mediaRecorder = null;
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;

    return blob;
  }
}

export function isVoiceRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"
  );
}
