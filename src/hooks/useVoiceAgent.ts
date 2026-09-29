// src/hooks/useVoiceAgent.ts
"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { LiveAudioStreamer } from "@/lib/audio/liveAudioStreamer";

const emptySubscribe = () => () => {};

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

export type TurnTakingState =
  | "IDLE"
  | "LISTENING"
  | "USER_SPEAKING"
  | "SILENCE_PENDING"
  | "PROCESSING"
  | "AI_SPEAKING"
  | "ERROR";

export const SILENCE_DURATION_MS = 2000;

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "ready" | "loading" | "error" | "unavailable";

export function useVoiceAgent() {
  const [turnTakingState, setTurnTakingState] = useState<TurnTakingState>("IDLE");
  const turnTakingStateRef = useRef<TurnTakingState>("IDLE");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef<boolean>(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const isVoiceSupported = useSyncExternalStore(
    emptySubscribe,
    () => Boolean(typeof window !== "undefined" && (window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)),
    () => false
  );
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [activeSessionMode, setActiveSessionMode] = useState<"live" | "fallback">("live");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLiveConnected] = useState(true);
  const [isContinuousMode, setIsContinuousMode] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState<string>("en-IN");

  // Synchronize TurnTakingState with legacy VoiceState for backward compatibility
  const updateTurnTakingState = useCallback((nextState: TurnTakingState) => {
    turnTakingStateRef.current = nextState;
    setTurnTakingState(nextState);
    switch (nextState) {
      case "IDLE":
        setVoiceState("idle");
        break;
      case "LISTENING":
      case "USER_SPEAKING":
      case "SILENCE_PENDING":
        setVoiceState("listening");
        break;
      case "PROCESSING":
        setVoiceState("thinking");
        break;
      case "AI_SPEAKING":
        setVoiceState("speaking");
        break;
      case "ERROR":
        setVoiceState("error");
        break;
    }
  }, []);

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
  const preloadedGreetingBufferRef = useRef<ArrayBuffer | null>(null);

  /**
   * Automatically mutes and stops the microphone:
   * Aborts active speech recognition, cancels silence timers, and sets isListening = false.
   */
  const muteMic = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    isListeningRef.current = false;
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
    console.log("[VoiceTurn] 🔇 Mic automatically MUTED");
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
            updateTurnTakingState("AI_SPEAKING");
            onPlaybackStartCallbackRef.current?.();
          },
          onPlaybackEnd: () => {
            setIsSpeaking(false);
            setIsLoadingVoice(false);
            updateTurnTakingState("IDLE");
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
  }, [muteMic, updateTurnTakingState]);

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
    updateTurnTakingState("IDLE");
  }, [updateTurnTakingState]);

  /**
   * Immediately interrupts playback, cancels scheduled Web Audio sources,
   * and reports interruption telemetry to the active Mitra session.
   */
  const interruptPlayback = useCallback(
    (reason: string = "barge_in") => {
      console.log(`[VoiceAgent] ⚡ Interruption (barge-in): ${reason}`);
      stopSpeaking();
      if (activeSessionId) {
        fetch("/api/agent/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "status",
            sessionId: activeSessionId,
            status: "interrupted",
          }),
        }).catch(() => {});
      }
    },
    [stopSpeaking, activeSessionId]
  );

  /**
   * Plays canonical Agent speechText by streaming real-time 24kHz PCM chunks
   * from the server-authoritative Google Gemini voice pipeline into Web Audio API.
   * Strictly Google-only neural audio. Zero browser speechSynthesis or OpenAI fallbacks.
   */
  const speak = useCallback(
    async (
      text: string,
      timingOrOptions?: { tSubmit?: number; tTextVisible?: number } | string | { language?: string; timing?: any; onPlaybackEnd?: () => void; onPlaybackStart?: () => void },
      onPlaybackEnd?: () => void,
      onPlaybackStart?: () => void,
      language?: string
    ) => {
      let resolvedLang = language;
      let resolvedOnEnd = onPlaybackEnd;
      let resolvedOnStart = onPlaybackStart;

      if (typeof timingOrOptions === "string") {
        resolvedLang = timingOrOptions;
      } else if (timingOrOptions && typeof timingOrOptions === "object" && "language" in timingOrOptions) {
        resolvedLang = (timingOrOptions as any).language;
        if ((timingOrOptions as any).onPlaybackEnd) resolvedOnEnd = (timingOrOptions as any).onPlaybackEnd;
        if ((timingOrOptions as any).onPlaybackStart) resolvedOnStart = (timingOrOptions as any).onPlaybackStart;
      }

      onPlaybackStartCallbackRef.current = resolvedOnStart || null;
      onPlaybackFinishedCallbackRef.current = resolvedOnEnd || null;

      if (isVoiceMuted) {
        resolvedOnStart?.();
        resolvedOnEnd?.();
        return;
      }

      const trimmedText = text.trim();
      if (!trimmedText) {
        resolvedOnStart?.();
        resolvedOnEnd?.();
        return;
      }

      muteMic();
      stopSpeaking();
      unlockAudio();

      const playId = ++activePlayIdRef.current;
      setIsLoadingVoice(true);
      setVoiceState("loading");
      setVoiceError(null);

      const targetLanguage = resolvedLang || voiceLanguage || "en-IN";
      const tTtsStart = performance.now();
      console.log(`[CanonicalVoice] Event: SPEAK | lang: ${targetLanguage} | len: ${trimmedText.length} | text: "${trimmedText.slice(0, 70)}..."`);

      const cleanLower = trimmedText.toLowerCase().replace(/\s+/g, " ");
      const canonicalGreetingClean = "hey there! i'm mitra, your ai website architect. what kind of business or website are you building today? tell me your vision, or tap the mic and let's chat!";
      const isGreeting = cleanLower === canonicalGreetingClean;

      // Instant 0ms client-side playback of preloaded greeting buffer ONLY on exact match
      if (isGreeting && preloadedGreetingBufferRef.current && streamerRef.current) {
        console.log("[VoiceAgent] Instant 0ms playback of preloaded greeting buffer (exact match verified)!");
        updateTurnTakingState("AI_SPEAKING");
        onPlaybackStartCallbackRef.current?.();
        await streamerRef.current.pushChunk(preloadedGreetingBufferRef.current);
        streamerRef.current.signalTurnComplete(() => {
          if (playId === activePlayIdRef.current) {
            setIsSpeaking(false);
            setIsLoadingVoice(false);
            updateTurnTakingState("IDLE");
            onPlaybackFinishedCallbackRef.current?.();
          }
        });
        return;
      }

      const abortController = new AbortController();
      const abortTimeout = setTimeout(() => abortController.abort(), 18000);

      try {
        const res = await fetch("/api/agent/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmedText,
            language: targetLanguage,
          }),
          signal: abortController.signal,
        });
        clearTimeout(abortTimeout);

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
                updateTurnTakingState("IDLE");
                resolvedOnEnd?.();
              }
            });
          } else {
            console.warn("[VoiceAgent] Google Voice returned zero audio bytes. Text mode active; zero browser synthesis fallback.");
            setIsSpeaking(false);
            setIsLoadingVoice(false);
            updateTurnTakingState("IDLE");
            resolvedOnStart?.();
            resolvedOnEnd?.();
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
            updateTurnTakingState("IDLE");
            resolvedOnEnd?.();
          }
        };

        muteMic();
        source.start(0);
        setIsLoadingVoice(false);
        setIsSpeaking(true);
        updateTurnTakingState("AI_SPEAKING");
        resolvedOnStart?.();
      } catch (err) {
        if (playId === activePlayIdRef.current) {
          console.warn("[VoiceAgent] Google Voice playback error (zero browser synthesis fallback):", err);
          setIsSpeaking(false);
          setIsLoadingVoice(false);
          updateTurnTakingState("IDLE");
          resolvedOnStart?.();
          resolvedOnEnd?.();
        }
      }
    },
    [isVoiceMuted, voiceLanguage, muteMic, stopSpeaking, unlockAudio, updateTurnTakingState]
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
   * 2. Mandatory 2-SECOND CONTINUOUS SILENCE RULE:
   *    - recognition.continuous = true (does NOT end on short pause)
   *    - VAD timer resets on any speech activity (interim or final)
   *    - Turn finishes ONLY after 2000ms of continuous silence
   * 3. When silence timer fires, turns mic OFF and triggers auto-submission
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
        updateTurnTakingState("ERROR");
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
        isListeningRef.current = true;

        // Continuous recognition: prevents browser from prematurely stopping after short phrases
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = voiceLanguage || "en-IN";

        recognition.onstart = () => {
          setIsListening(true);
          updateTurnTakingState("LISTENING");
          setVoiceError(null);
          console.log(`[VoiceTurn] 🎙️ Mic active (${recognition.lang}) - Listening`);
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
            if (isSpeaking) {
              interruptPlayback("user_speech_barge_in");
            }
            currentTranscriptRef.current = clean;
            onTranscriptCallbackRef.current?.(clean);

            // User is actively speaking
            updateTurnTakingState("USER_SPEAKING");

            // Reset silence VAD auto-submit timer on ANY voice event
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }

            // Move to SILENCE_PENDING
            updateTurnTakingState("SILENCE_PENDING");

            // Mandatory 2-Second continuous silence rule
            silenceTimerRef.current = setTimeout(() => {
              if (hasSubmittedRef.current || isCanceledRef.current) return;
              const textToSubmit = currentTranscriptRef.current.trim();
              if (textToSubmit) {
                hasSubmittedRef.current = true;
                console.log(`[VoiceTurn] Continuous 2000ms silence detected -> Auto-submitting turn: "${textToSubmit}"`);
                updateTurnTakingState("PROCESSING");
                muteMic();
                onFinalSubmitCallbackRef.current?.(textToSubmit);
              }
            }, SILENCE_DURATION_MS);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn(`[VoiceDebug] speech recognition event: ${event.error}`);

          // Benign / expected browser events that must NEVER show error:
          if (
            event.error === "aborted" ||
            event.error === "no-speech" ||
            event.error === "service-not-allowed" ||
            event.error === "language-not-supported"
          ) {
            console.log(`[VoiceDebug] Non-fatal speech event (${event.error}) handled cleanly.`);
            // If silence timer is running, let it complete rather than cutting off user
            if (!silenceTimerRef.current) {
              setVoiceError(null);
              if (!hasSubmittedRef.current && currentTranscriptRef.current.trim() === "") {
                updateTurnTakingState("IDLE");
              }
            }
            return;
          }

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setIsListening(false);
          isListeningRef.current = false;

          if (event.error === "not-allowed") {
            setVoiceError("Microphone access was denied. Please allow mic permission in your browser.");
            updateTurnTakingState("ERROR");
          } else {
            setVoiceError(`Voice input error: ${event.error}`);
            updateTurnTakingState("ERROR");
          }
        };

        // Turn boundary: If silenceTimerRef is still pending, do NOT abort!
        recognition.onend = () => {
          console.log("[VoiceDebug] speech recognition onend fired");
          if (silenceTimerRef.current) {
            console.log("[VoiceDebug] onend fired while silence timer is pending (preserving 2s silence rule)");
            return;
          }

          setIsListening(false);
          isListeningRef.current = false;

          const textToSubmit = currentTranscriptRef.current.trim();
          if (textToSubmit && !hasSubmittedRef.current && !isCanceledRef.current) {
            hasSubmittedRef.current = true;
            updateTurnTakingState("PROCESSING");
            muteMic();
            console.log(`[VoiceDebug] transcript submitted on speech end: "${textToSubmit}"`);
            onFinalSubmitCallbackRef.current?.(textToSubmit);
          } else if (!hasSubmittedRef.current) {
            muteMic();
            updateTurnTakingState("IDLE");
          }
        };

        recognition.start();
      } catch (err) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsListening(false);
        isListeningRef.current = false;
        setVoiceError(err instanceof Error ? err.message : "Could not start microphone.");
        updateTurnTakingState("ERROR");
      }
    },
    [interruptPlayback, isSpeaking, muteMic, stopSpeaking, unlockAudio, updateTurnTakingState, voiceLanguage]
  );

  const stopListening = useCallback(() => {
    muteMic();
    updateTurnTakingState("IDLE");
  }, [muteMic, updateTurnTakingState]);

  const cancelListening = useCallback(() => {
    muteMic();
    isCanceledRef.current = true;
    currentTranscriptRef.current = "";
    updateTurnTakingState("IDLE");
  }, [muteMic, updateTurnTakingState]);

  // Preload canonical greeting audio buffer on mount for instant 0ms latency upon interaction
  useEffect(() => {
    let isCancelled = false;
    const greetingText = "Hey there! I'm Mitra, your AI Website Architect. What kind of business or website are you building today? Tell me your vision, or tap the mic and let's chat!";
    fetch("/api/agent/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: greetingText }),
    })
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => {
        if (!isCancelled && buf && buf.byteLength > 0) {
          preloadedGreetingBufferRef.current = buf;
          console.log(`[VoiceAgent] Preloaded greeting audio buffer ready (${buf.byteLength} bytes)`);
        }
      })
      .catch((err) => {
        console.warn("[VoiceAgent] Preload greeting audio warning:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
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
    turnTakingState,
    setTurnTakingState: updateTurnTakingState,
    voiceState,
    setVoiceState,
    isSpeaking,
    isLoadingVoice,
    isListening,
    isVoiceMuted,
    isVoiceSupported,
    voiceError,
    isLiveConnected,
    activeSessionMode,
    setActiveSessionMode,
    activeSessionId,
    setActiveSessionId,
    interruptPlayback,
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
