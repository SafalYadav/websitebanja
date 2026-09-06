// src/lib/audio/liveAudioStreamer.ts

/**
 * LiveAudioStreamer
 * Progressive, gapless Web Audio API player for streamed 24kHz 16-bit mono linear PCM chunks.
 * Handles Safari WebKit autoplay restrictions, sample rate conversions, and odd-byte chunk boundary alignment.
 */
export class LiveAudioStreamer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scheduledTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private endTimeoutId: any = null;
  private isPlaying: boolean = false;
  private chunkCount: number = 0;
  private totalBytes: number = 0;
  private sampleRate: number = 24000;
  private residueBuffer: Uint8Array | null = null;

  private onPlaybackStartCallback?: () => void;
  private onPlaybackEndCallback?: () => void;
  private onErrorCallback?: (err: Error) => void;

  constructor(options?: {
    sampleRate?: number;
    onPlaybackStart?: () => void;
    onPlaybackEnd?: () => void;
    onError?: (err: Error) => void;
  }) {
    if (options?.sampleRate) this.sampleRate = options.sampleRate;
    this.onPlaybackStartCallback = options?.onPlaybackStart;
    this.onPlaybackEndCallback = options?.onPlaybackEnd;
    this.onErrorCallback = options?.onError;
  }

  /**
   * Pre-warms or attaches an existing AudioContext on user gesture.
   * Plays a 1-sample silent sound to force Safari/WebKit audio hardware activation.
   */
  public async unlock(existingContext?: AudioContext | null): Promise<AudioContext> {
    if (existingContext && existingContext !== this.audioContext) {
      this.audioContext = existingContext;
      this.masterGain = null;
    }

    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('Web Audio API is not supported in this browser environment.');
      }
      this.audioContext = new AudioCtx();
    }

    const stateBefore = this.audioContext.state;
    console.log(`[VoiceDebug] AudioContext state before playback: ${stateBefore}`);

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('[VoiceDebug] AudioContext.resume() caught:', err);
      }
    }

    const stateAfter = this.audioContext.state;
    console.log(`[VoiceDebug] AudioContext state after resume: ${stateAfter}`);

    // Safari WebKit hardware wakeup: play a 1-sample silent buffer
    try {
      const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
      const silentSource = this.audioContext.createBufferSource();
      silentSource.buffer = silentBuffer;
      silentSource.connect(this.audioContext.destination);
      silentSource.start(0);
    } catch {
      // ignore
    }

    if (!this.masterGain || this.masterGain.context !== this.audioContext) {
      if (this.audioContext) {
        try {
          if (this.masterGain) {
            this.masterGain.disconnect();
          }
        } catch {
          // ignore
        }
        try {
          this.masterGain = this.audioContext.createGain();
          this.masterGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
          this.masterGain.connect(this.audioContext.destination);
        } catch {
          this.masterGain = null;
        }
      }
    }

    return this.audioContext;
  }

  /**
   * Pushes a raw 24kHz 16-bit linear PCM chunk to be scheduled and played immediately.
   * Automatically handles byte alignment when chunks split across 2-byte Int16 boundaries.
   */
  public async pushChunk(data: string | Uint8Array | ArrayBuffer): Promise<void> {
    try {
      const ctx = await this.unlock(this.audioContext);

      // 1. Normalize data to Uint8Array
      let incomingBytes: Uint8Array;
      if (typeof data === 'string') {
        const binaryString = atob(data);
        incomingBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          incomingBytes[i] = binaryString.charCodeAt(i);
        }
      } else if (data instanceof Uint8Array) {
        incomingBytes = data;
      } else {
        incomingBytes = new Uint8Array(data);
      }

      if (incomingBytes.length === 0) return;

      // Slice large incoming buffers (> 16KB) to keep main UI thread completely responsive
      const MAX_SLICE = 16384;
      if (incomingBytes.length > MAX_SLICE) {
        for (let offset = 0; offset < incomingBytes.length; offset += MAX_SLICE) {
          const slice = incomingBytes.subarray(offset, Math.min(offset + MAX_SLICE, incomingBytes.length));
          await this.pushChunk(slice);
        }
        return;
      }

      // 2. Combine with residue from previous chunk if an Int16 sample was split
      let alignedBytes: Uint8Array;
      if (this.residueBuffer && this.residueBuffer.length > 0) {
        const combined = new Uint8Array(this.residueBuffer.length + incomingBytes.length);
        combined.set(this.residueBuffer, 0);
        combined.set(incomingBytes, this.residueBuffer.length);
        alignedBytes = combined;
        this.residueBuffer = null;
      } else {
        alignedBytes = incomingBytes;
      }

      // 3. Int16 requires 2 bytes per sample. If length is odd, save 1 trailing byte for next chunk
      if (alignedBytes.length % 2 !== 0) {
        this.residueBuffer = alignedBytes.slice(alignedBytes.length - 1);
        alignedBytes = alignedBytes.slice(0, alignedBytes.length - 1);
      }

      if (alignedBytes.byteLength < 2) return;

      this.chunkCount++;
      this.totalBytes += alignedBytes.byteLength;

      // 4. Convert 16-bit signed PCM (little-endian) to Float32Array [-1.0, 1.0]
      const numSamples = alignedBytes.byteLength / 2;
      const dataView = new DataView(alignedBytes.buffer, alignedBytes.byteOffset, alignedBytes.byteLength);
      const float32 = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const int16Sample = dataView.getInt16(i * 2, true);
        float32[i] = int16Sample / 32768.0;
      }

      console.log(`[VoiceDebug] decoded sample count: ${numSamples}`);

      // 5. Create AudioBuffer using getChannelData (universal Safari support)
      const audioBuffer = ctx.createBuffer(1, numSamples, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // 6. Seamless gapless scheduling with 30ms lead time for WebKit thread dispatch
      const now = ctx.currentTime;
      const startTime = Math.max(this.scheduledTime, now + 0.03);
      source.start(startTime);
      console.log(`[VoiceDebug] source.start() called: start=${startTime.toFixed(3)}s, current=${now.toFixed(3)}s, dur=${audioBuffer.duration.toFixed(3)}s`);

      this.scheduledTime = startTime + audioBuffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
      };

      if (!this.isPlaying) {
        this.isPlaying = true;
        console.log('[VoiceDebug] playback started');
        this.onPlaybackStartCallback?.();
      }
    } catch (err) {
      console.warn('[VoiceDebug] any exception in pushChunk:', err);
      this.onErrorCallback?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Signals that all audio chunks for the current turn have been received from the server.
   * Sets up a callback to trigger when the last queued audio chunk has finished playing.
   */
  public signalTurnComplete(onComplete?: () => void): void {
    if (this.endTimeoutId) {
      clearTimeout(this.endTimeoutId);
      this.endTimeoutId = null;
    }

    if (!this.audioContext || !this.isPlaying) {
      this.isPlaying = false;
      this.scheduledTime = 0;
      console.log('[VoiceDebug] playback ended (immediate)');
      onComplete?.();
      this.onPlaybackEndCallback?.();
      return;
    }

    const now = this.audioContext.currentTime;
    const remainingSeconds = Math.max(0, this.scheduledTime - now);
    const delayMs = Math.ceil(remainingSeconds * 1000) + 80;

    this.endTimeoutId = setTimeout(() => {
      this.isPlaying = false;
      this.activeSources = [];
      this.scheduledTime = 0;
      this.residueBuffer = null;
      this.endTimeoutId = null;
      console.log('[VoiceDebug] playback ended');
      onComplete?.();
      this.onPlaybackEndCallback?.();
    }, delayMs);
  }

  /**
   * Stops playback immediately, cancels all queued audio, and clears sources.
   * Used for user interruption (barge-in) and state resets.
   */
  public stopAndClear(): void {
    if (this.endTimeoutId) {
      clearTimeout(this.endTimeoutId);
      this.endTimeoutId = null;
    }

    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {
        // ignore already stopped sources
      }
    }

    this.activeSources = [];
    this.scheduledTime = 0;
    this.residueBuffer = null;
    this.isPlaying = false;
    this.chunkCount = 0;
    this.totalBytes = 0;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getMetrics() {
    return {
      chunkCount: this.chunkCount,
      totalBytes: this.totalBytes,
      scheduledTime: this.scheduledTime,
    };
  }

  public dispose(): void {
    this.stopAndClear();
    if (this.audioContext) {
      try {
        void this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
  }
}
