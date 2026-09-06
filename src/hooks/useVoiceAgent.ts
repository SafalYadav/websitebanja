// src/hooks/useVoiceAgent.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LiveAudioStreamer } from "@/lib/audio/liveAudioStreamer";

// Web Speech API TypeScript type shims
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitAudioContext?: typeof AudioContext;
  }
}

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "ready" | "loading" | "error" | "unavailable";

export function useVoiceAgent() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [isContinuousMode, setIsContinuousMode] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState<string>("en-IN");

  // Web Speech recognition refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptCallbackRef = useRef<((text: string) => void) | null>(null);
  const onFinalSubmitCallbackRef = useRef<((text: string) => void) | null>(null);
  const currentTranscriptRef = useRef<string>("");
  const hasSubmittedRef = useRef<boolean>(false);
  const isCanceledRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio & Live Streaming player refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamerRef = useRef<LiveAudioStreamer | null>(null);
  const activePlayIdRef = useRef<number>(0);
  const activeReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const onPlaybackFinishedCallbackRef = useRef<(() => void) | null>(null);
  const onPlaybackStartCallbackRef = useRef<(() => void) | null>(null);

  /**
   * Automatically mutes and stops the microphone:
   * Aborts active speech recognition, cancels silence timers, and sets isListening = false.
   */
  const muteMic = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    hasSubmittedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    console.log("[VoiceTurn] 🔇 Mic automatically MUTED (Agent speaking/thinking)");
  }, []);

  /**
   * Initializes or unlocks the Web Audio API context during user gesture.
   */
  const unlockAudio = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioCtx();
        if (streamerRef.current) {
          streamerRef.current.dispose();
          streamerRef.current = null;
        }
      }

      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume();
      }

      if (!streamerRef.current && audioContextRef.current) {
        streamerRef.current = new LiveAudioStreamer({
          sampleRate: 24000,
          onPlaybackStart: () => {
            muteMic(); // Auto-mute mic the exact millisecond audio playback starts
            setIsSpeaking(true);
            setIsLoadingVoice(false);
            setVoiceState("speaking");
            onPlaybackStartCallbackRef.current?.();
          },
          onPlaybackEnd: () => {
            setIsSpeaking(false);
            setIsLoadingVoice(false);
            onPlaybackFinishedCallbackRef.current?.();
          },
          onError: (err) => {
            console.warn("[VoiceAgent] LiveAudioStreamer warning:", err);
          },
        });
      }

      if (streamerRef.current && audioContextRef.current) {
        void streamerRef.current.unlock(audioContextRef.current);
      }
    } catch (err) {
      console.warn("[VoiceAgent] AudioContext unlock warning:", err);
    }
  }, [muteMic]);

  /**
   * Stops any currently playing audio immediately and cancels ongoing stream readers.
   */
  const stopSpeaking = useCallback(() => {
    activePlayIdRef.current++;

    if (activeReaderRef.current) {
      try {
        void activeReaderRef.current.cancel();
      } catch {
        // ignore
      }
      activeReaderRef.current = null;
    }

    if (streamerRef.current) {
      streamerRef.current.stopAndClear();
    }

    setIsSpeaking(false);
    setIsLoadingVoice(false);
  }, []);

  /**
   * Plays canonical Agent speechText by streaming real-time 24kHz PCM chunks
   * from the server-authoritative Gemini Live voice pipeline into Web Audio API.
   */
  const speak = useCallback(
    async (
      text: string,
      timing?: { tSubmit?: number; tTextVisible?: number },
      onPlaybackEnd?: () => void,
      onPlaybackStart?: () => void
    ) => {
      onPlaybackStartCallbackRef.current = onPlaybackStart || null;
      onPlaybackFinishedCallbackRef.current = onPlaybackEnd || null;

      if (isVoiceMuted) {
        onPlaybackStart?.();
        onPlaybackEnd?.();
        return;
      }

      const trimmedText = text.trim();
      if (!trimmedText) {
        onPlaybackStart?.();
        onPlaybackEnd?.();
        return;
      }

      muteMic();
      stopSpeaking();
      unlockAudio();

      const playId = ++activePlayIdRef.current;
      setIsLoadingVoice(true);
      setVoiceState("loading");
      setVoiceError(null);

      const tTtsStart = performance.now();
      console.log(`[VoiceDebug] voice request started: "${trimmedText}"`);

      try {
        const res = await fetch("/api/agent/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmedText }),
        });

        if (playId !== activePlayIdRef.current) return;

        console.log(`[VoiceDebug] voice HTTP status: ${res.status}`);
        const contentType = res.headers.get("content-type") || "";
        console.log(`[VoiceDebug] response content-type: ${contentType}`);

        if (!res.ok) {
          throw new Error(`Voice endpoint returned HTTP ${res.status}`);
        }

        // Progressive streaming PCM response
        if (contentType.includes("audio/pcm") || res.body) {
          const reader = res.body?.getReader();
          if (!reader) throw new Error("No readable stream in voice response");
          activeReaderRef.current = reader;

          let receivedAnyBytes = false;
          let firstChunkLogged = false;
          let totalBytes = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (playId !== activePlayIdRef.current) {
              void reader.cancel();
              return;
            }

            if (value && value.byteLength > 0) {
              totalBytes += value.byteLength;
              if (!firstChunkLogged) {
                firstChunkLogged = true;
                const tFirst = performance.now();
                console.log(
                  `[VoiceDebug] first PCM chunk received: ${value.byteLength} bytes (+${(tFirst - tTtsStart).toFixed(0)}ms)`
                );
              }
              receivedAnyBytes = true;
              if (streamerRef.current) {
                await streamerRef.current.pushChunk(value);
              }
            }
          }

          console.log(`[VoiceDebug] total PCM bytes received: ${totalBytes}`);

          if (playId !== activePlayIdRef.current) return;
          activeReaderRef.current = null;

          if (receivedAnyBytes && streamerRef.current) {
            streamerRef.current.signalTurnComplete(() => {
              if (playId === activePlayIdRef.current) {
                setIsSpeaking(false);
                setIsLoadingVoice(false);
                setVoiceState("idle");
                onPlaybackEnd?.();
              }
            });
          } else {
            setIsSpeaking(false);
            setIsLoadingVoice(false);
            setVoiceState("idle");
            onPlaybackEnd?.();
          }
          return;
        }

        // Standard audio/wav response fallback
        const arrayBuffer = await res.arrayBuffer();
        if (playId !== activePlayIdRef.current) return;

        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error("Empty audio buffer returned from voice endpoint");
        }

        if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) audioContextRef.current = new AudioCtx();
        }

        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === "suspended") await ctx.resume();

        const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
          ctx.decodeAudioData(
            arrayBuffer.slice(0),
            (decoded) => resolve(decoded),
            (decodeErr) => reject(decodeErr)
          );
        });

        if (playId !== activePlayIdRef.current) return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        source.onended = () => {
          if (playId === activePlayIdRef.current) {
            setIsSpeaking(false);
            setIsLoadingVoice(false);
            setVoiceState("idle");
            onPlaybackEnd?.();
          }
        };

        muteMic();
        source.start(0);
        setIsLoadingVoice(false);
        setIsSpeaking(true);
        setVoiceState("speaking");
        onPlaybackStart?.();
      } catch (err) {
        if (playId === activePlayIdRef.current) {
          console.warn("[VoiceAgent] Voice playback error:", err);
          setIsSpeaking(false);
          setIsLoadingVoice(false);
          setVoiceState("error");
          onPlaybackStart?.();
          onPlaybackEnd?.();
        }
      }
    },
    [isVoiceMuted, muteMic, stopSpeaking, unlockAudio]
  );

  const toggleMute = useCallback(() => {
    setIsVoiceMuted((prev) => {
      if (!prev) {
        stopSpeaking();
      }
      return !prev;
    });
  }, [stopSpeaking]);

  /**
   * Speech-To-Text with turn-boundary control:
   * 1. Turns mic ON
   * 2. When user stops speaking, turns mic OFF immediately (preventing feedback/self-capture)
   * 3. Triggers auto-submission
   */
  const startListening = useCallback(
    (
      onTranscript: (text: string) => void,
      onFinalSubmit?: (finalText: string) => void
    ) => {
      setVoiceError(null);
      if (typeof window === "undefined") return;

      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        setVoiceError("Voice speech recognition is not supported in your browser.");
        return;
      }

      try {
        stopSpeaking();
        unlockAudio(); // Pre-warm audio context during user mic interaction

        if (recognitionRef.current) {
          try {
            recognitionRef.current.onstart = null;
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
          recognitionRef.current = null;
        }

        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;
        onTranscriptCallbackRef.current = onTranscript;
        onFinalSubmitCallbackRef.current = onFinalSubmit || null;
        currentTranscriptRef.current = "";
        hasSubmittedRef.current = false;
        isCanceledRef.current = false;

        recognition.continuous = false;
        recognition.interimResults = true;
        // Universal Indian multilingual speech recognition locale:
        // 'en-IN' is natively supported on macOS/iOS Safari and Chrome.
        // It recognizes all Indian accents, Hinglish, Gujarati, Tamil, Marathi, etc.
        // without triggering Apple Speech server 'aborted' or 'service-not-allowed' errors.
        recognition.lang = "en-IN";

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceState("listening");
          setVoiceError(null);
          console.log(`[VoiceTurn] 🎙️ Mic automatically UNMUTED (en-IN) - User turn`);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result && result[0]) {
              fullTranscript += result[0].transcript;
            }
          }
          const clean = fullTranscript.trim();
          if (clean) {
            currentTranscriptRef.current = clean;
            onTranscriptCallbackRef.current?.(clean);

            // Reset silence VAD auto-submit timer
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }

            const lastResult = event.results[event.results.length - 1];
            const isFinal = Boolean(lastResult && (lastResult as any).isFinal);
            const silenceDelay = isFinal ? 750 : 1200;

            silenceTimerRef.current = setTimeout(() => {
              if (hasSubmittedRef.current || isCanceledRef.current) return;
              const textToSubmit = currentTranscriptRef.current.trim();
              if (textToSubmit) {
                hasSubmittedRef.current = true;
                console.log(`[VoiceTurn] Silence detected (${silenceDelay}ms) -> Auto-submitting hands-free: "${textToSubmit}"`);
                muteMic();
                setVoiceState("thinking");
                onFinalSubmitCallbackRef.current?.(textToSubmit);
              }
            }, silenceDelay);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setIsListening(false);
          console.warn(`[VoiceDebug] speech recognition event: ${event.error}`);

          // Benign / expected browser events that must NEVER show error:
          // - 'aborted': Occurs when recognition stops, turn transitions, or old session cancels.
          // - 'no-speech': Occurs when user pauses or doesn't speak.
          // - 'service-not-allowed' / 'language-not-supported': Occurs on unsupported OS dictation locales.
          if (
            event.error === "aborted" ||
            event.error === "no-speech" ||
            event.error === "service-not-allowed" ||
            event.error === "language-not-supported"
          ) {
            console.log(`[VoiceDebug] Non-fatal speech event (${event.error}) handled cleanly.`);
            setVoiceError(null);
            setVoiceState("idle");
            return;
          }

          if (event.error === "not-allowed") {
            setVoiceError("Microphone access was denied. Please allow mic permission in your browser.");
            setVoiceState("error");
          } else {
            setVoiceError(`Voice input error: ${event.error}`);
            setVoiceState("error");
          }
        };

        // Turn boundary: User speech ends -> MIC OFF immediately (feedback prevention)
        recognition.onend = () => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setIsListening(false);
          console.log("[VoiceDebug] speech ended");
          const textToSubmit = currentTranscriptRef.current.trim();
          if (textToSubmit && !hasSubmittedRef.current && !isCanceledRef.current) {
            hasSubmittedRef.current = true;
            muteMic();
            setVoiceState("thinking"); // Transition to thinking state immediately
            console.log(`[VoiceDebug] transcript submitted on speech end: "${textToSubmit}"`);
            onFinalSubmitCallbackRef.current?.(textToSubmit);
          } else if (!hasSubmittedRef.current) {
            muteMic();
            setVoiceState("idle");
          }
        };

        recognition.start();
      } catch (err) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsListening(false);
        setVoiceError(err instanceof Error ? err.message : "Could not start microphone.");
        setVoiceState("error");
      }
    },
    [muteMic, stopSpeaking, unlockAudio]
  );

  const stopListening = useCallback(() => {
    muteMic();
  }, [muteMic]);

  const cancelListening = useCallback(() => {
    muteMic();
    isCanceledRef.current = true;
    currentTranscriptRef.current = "";
    setVoiceState("idle");
  }, [muteMic]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsVoiceSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    }

    return () => {
      stopSpeaking();
      muteMic();
      if (streamerRef.current) {
        streamerRef.current.dispose();
      }
      if (audioContextRef.current) {
        try {
          void audioContextRef.current.close();
        } catch {
          // ignore
        }
        audioContextRef.current = null;
      }
    };
  }, [muteMic, stopSpeaking]);

  return {
    voiceState,
    setVoiceState,
    isSpeaking,
    isLoadingVoice,
    isListening,
    isVoiceMuted,
    isVoiceSupported,
    voiceError,
    isLiveConnected,
    isContinuousMode,
    setIsContinuousMode,
    voiceLanguage,
    setVoiceLanguage,
    unlockAudio,
    speak,
    stopSpeaking,
    toggleMute,
    startListening,
    stopListening,
    cancelListening,
    muteMic,
  };
}
