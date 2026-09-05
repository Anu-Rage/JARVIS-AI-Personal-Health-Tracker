function base64ToBlobUrl(base64: string, mimeType = "audio/mpeg"): string {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([array], { type: mimeType }));
}

/** Plays base64-encoded audio, reporting live playback amplitude (0-1) so a
 * visual can react to it, resolving once playback finishes. */
export function playAudioWithAmplitude(
  base64: string,
  onAmplitude: (level: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const url = base64ToBlobUrl(base64);
    const audioEl = new Audio(url);
    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audioEl);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let rafId: number | null = null;

    function tick() {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const centered = (data[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      onAmplitude(Math.min(rms * 4, 1));
      rafId = requestAnimationFrame(tick);
    }

    function cleanup() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      onAmplitude(0);
      audioContext.close();
      URL.revokeObjectURL(url);
      resolve();
    }

    audioEl.onended = cleanup;
    audioEl.onerror = cleanup;
    audioEl.play().then(tick);
  });
}
