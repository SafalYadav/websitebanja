"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useBuilderStore } from "@/store/builderStore";
import { createProject, updateProject } from "@/lib/projects";
import { editorRoute, loginRoute } from "@/lib/editorRoutes";
import { supabase } from "@/lib/supabase";
import { toast } from "@/store/toastStore";
import { cn } from "@/lib/utils";
import type { ExtractedUserNeeds, AgentMessage, AgentTalkResponse } from "@/types/aiAgent";

import {
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Layers,
  Palette,
  Target,
  Briefcase,
  Sliders,
  ChevronDown,
  ChevronUp,
  X,
  Square,
  Globe,
} from "lucide-react";
import {
  MITRA_LANGUAGES,
  MITRA_LANGUAGE_LIST,
  getMitraLanguageConfig,
  type MitraLanguageId,
} from "@/lib/constants/mitraLanguages";

interface AiTalkingAgentProps {
  projectId?: string;
  initialNeeds?: Partial<ExtractedUserNeeds>;
  onReadyToBuild?: (needs: ExtractedUserNeeds) => void;
  className?: string;
  variant?: "embedded" | "modal" | "fullscreen";
}

export type MitraLanguage = MitraLanguageId;

export const MITRA_GREETINGS: Record<MitraLanguage, string> = Object.fromEntries(
  Object.entries(MITRA_LANGUAGES).map(([k, v]) => [k, v.greeting])
) as Record<MitraLanguage, string>;

export const MITRA_SUGGESTED_REPLIES: Record<MitraLanguage, string[]> = Object.fromEntries(
  Object.entries(MITRA_LANGUAGES).map(([k, v]) => [k, v.suggestedReplies])
) as Record<MitraLanguage, string[]>;

export function getInitialGreetingMessage(
  lang: MitraLanguage = "English",
  initialNeeds?: Partial<ExtractedUserNeeds>
): AgentMessage {
  const config = getMitraLanguageConfig(lang);
  return {
    id: "greeting",
    role: "assistant",
    content: config.greeting,
    speechText: config.greeting,
    timestamp: "Just now",
    suggestedReplies: config.suggestedReplies,
    extractedNeeds: {
      features: ["whatsapp", "contact_form", "testimonials", "google_maps"],
      ...initialNeeds,
    },
  };
}

const CANONICAL_INITIAL_GREETING = MITRA_GREETINGS.English;
const INITIAL_GREETING = getInitialGreetingMessage("English");

function AiOrbVisualizer({
  state,
  isVoiceMuted,
  onOrbClick,
  onStopSpeaking,
}: {
  state: "idle" | "listening" | "thinking" | "speaking";
  isVoiceMuted: boolean;
  onOrbClick: () => void;
  onStopSpeaking: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-3 sm:py-4">
      {/* Ambient Pulsing Glow Halo */}
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : state === "listening"
            ? { scale: [1, 1.25, 1], opacity: [0.6, 0.95, 0.6] }
            : state === "thinking"
            ? { rotate: [0, 360], scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }
            : state === "speaking"
            ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }
            : { scale: [0.95, 1.05, 0.95], opacity: [0.35, 0.55, 0.35] }
        }
        transition={
          shouldReduceMotion
            ? {}
            : {
                repeat: Infinity,
                duration: state === "listening" ? 1.4 : state === "thinking" ? 4 : state === "speaking" ? 1.2 : 3.2,
                ease: "easeInOut",
              }
        }
        className={cn(
          "absolute -inset-8 rounded-full blur-3xl pointer-events-none transition-colors duration-700",
          state === "listening" && "bg-gradient-to-r from-emerald-500/40 via-cyan-400/35 to-teal-500/40",
          state === "thinking" && "bg-gradient-to-r from-amber-500/40 via-violet-600/45 to-indigo-600/40",
          state === "speaking" && "bg-gradient-to-r from-violet-600/50 via-cyan-500/40 to-blue-600/50",
          state === "idle" && "bg-gradient-to-r from-indigo-500/25 via-violet-500/25 to-cyan-500/20"
        )}
      />

      {/* Concentric Ripple Waves for Listening */}
      {state === "listening" && !shouldReduceMotion && (
        <>
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
            className="absolute h-44 w-44 sm:h-52 sm:w-52 lg:h-56 lg:w-56 rounded-full border-2 border-emerald-400/60 pointer-events-none"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.8, delay: 0.5, ease: "easeOut" }}
            className="absolute h-44 w-44 sm:h-52 sm:w-52 lg:h-56 lg:w-56 rounded-full border border-cyan-400/50 pointer-events-none"
          />
        </>
      )}

      {/* Gyroscopic Orbital Rings for Thinking */}
      {state === "thinking" && !shouldReduceMotion && (
        <div className="absolute h-48 w-48 sm:h-56 sm:w-56 lg:h-60 lg:w-60 pointer-events-none flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4.5, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/60"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            className="absolute inset-3 rounded-full border border-violet-400/50"
          />
        </div>
      )}

      {/* The Central Animated Orb - Prominent & Proportionate */}
      <motion.button
        type="button"
        onClick={onOrbClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={
          state === "listening"
            ? "Mitra is listening. Tap to pause."
            : state === "speaking"
            ? "Mitra is speaking. Tap to stop playback."
            : "Tap to talk with Mitra"
        }
        className={cn(
          "relative z-10 h-40 w-40 sm:h-48 sm:w-48 lg:h-52 lg:w-52 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden shadow-2xl",
          "border-2",
          state === "listening" && "border-emerald-400/80 shadow-emerald-500/40 ring-4 ring-emerald-500/20",
          state === "thinking" && "border-amber-400/80 shadow-amber-500/40 ring-4 ring-amber-500/20",
          state === "speaking" && "border-violet-400/90 shadow-violet-500/50 ring-4 ring-violet-500/25",
          state === "idle" && "border-white/20 shadow-indigo-500/20 hover:border-cyan-400/50"
        )}
        style={{
          background:
            state === "listening"
              ? "radial-gradient(circle at 35% 35%, #10b981 0%, #064e3b 55%, #022c22 100%)"
              : state === "thinking"
              ? "radial-gradient(circle at 35% 35%, #f59e0b 0%, #7c2d12 45%, #311042 100%)"
              : state === "speaking"
              ? "radial-gradient(circle at 35% 35%, #8b5cf6 0%, #3730a3 55%, #0f172a 100%)"
              : "radial-gradient(circle at 35% 35%, #6366f1 0%, #1e1b4b 60%, #09090b 100%)",
        }}
      >
        {/* Specular Highlight Gloss */}
        <div className="absolute top-2 left-6 h-12 w-20 rounded-full bg-white/20 blur-xs transform -rotate-45 pointer-events-none" />

        {/* Center Dynamic Core Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-white">
          {state === "listening" && (
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={shouldReduceMotion ? {} : { scale: [1, 1.25, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="h-12 w-12 rounded-full bg-emerald-500/30 flex items-center justify-center border border-emerald-300 shadow-inner"
              >
                <Mic className="h-6 w-6 text-emerald-100" />
              </motion.div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
                Listening
              </span>
            </div>
          )}

          {state === "thinking" && (
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={shouldReduceMotion ? {} : { rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="h-12 w-12 rounded-full border-2 border-amber-300 border-t-transparent flex items-center justify-center"
              >
                <Sparkles className="h-5 w-5 text-amber-200" />
              </motion.div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200">
                Thinking
              </span>
            </div>
          )}

          {state === "speaking" && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-end justify-center gap-1 h-8">
                {[0.4, 0.8, 1.0, 0.7, 0.9, 0.5].map((h, i) => (
                  <motion.span
                    key={i}
                    animate={
                      shouldReduceMotion
                        ? {}
                        : { height: ["6px", `${24 * h}px`, "6px"] }
                    }
                    transition={{
                      repeat: Infinity,
                      duration: 0.6 + i * 0.1,
                      repeatType: "reverse",
                      ease: "easeInOut",
                    }}
                    className="w-1.5 bg-white rounded-full inline-block shadow-xs"
                    style={{ height: "14px" }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-200">
                Speaking
              </span>
            </div>
          )}

          {state === "idle" && (
            <div className="flex flex-col items-center gap-1">
              <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Sparkles className="h-5 w-5 text-cyan-200" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-300 mt-1">
                Mitra AI
              </span>
            </div>
          )}
        </div>
      </motion.button>
    </div>
  );
}

export default function AiTalkingAgent({
  projectId,
  initialNeeds,
  onReadyToBuild,
  className,
  variant = "embedded",
}: AiTalkingAgentProps) {
  const router = useRouter();

  // Builder store bindings
  const setProjectId = useBuilderStore((state) => state.setProjectId);
  const setBusinessName = useBuilderStore((state) => state.setBusinessName);
  const setCategory = useBuilderStore((state) => state.setCategory);
  const setDescription = useBuilderStore((state) => state.setDescription);
  const setTargetAudience = useBuilderStore((state) => state.setTargetAudience);
  const setStyle = useBuilderStore((state) => state.setStyle);
  const setPrimaryColor = useBuilderStore((state) => state.setPrimaryColor);
  const setSecondaryColor = useBuilderStore((state) => state.setSecondaryColor);
  const setPhone = useBuilderStore((state) => state.setPhone);
  const setEmail = useBuilderStore((state) => state.setEmail);
  const setWhatsappNumber = useBuilderStore((state) => state.setWhatsappNumber);
  const setWhatsappEnabled = useBuilderStore((state) => state.setWhatsappEnabled);
  const setSelectedFeatures = useBuilderStore((state) => state.setSelectedFeatures);

  // Voice Agent Hook
  const {
    isSpeaking,
    voiceState,
    setVoiceState,
    isListening,
    isVoiceMuted,
    isVoiceSupported,
    voiceError,
    isContinuousMode,
    setIsContinuousMode,
    unlockAudio,
    speak,
    stopSpeaking,
    toggleMute,
    startListening,
    stopListening,
    cancelListening,
    muteMic,
    setVoiceLanguage,
  } = useVoiceAgent();

  // User-Selectable Language State (Default: English, session-persisted)
  const [selectedLanguage, setSelectedLanguage] = useState<MitraLanguage>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("mitra_session_language") as MitraLanguage;
        if (saved && saved in MITRA_LANGUAGES) {
          return saved;
        }
      } catch {}
    }
    return "English";
  });
  const selectedLanguageRef = useRef<MitraLanguage>(selectedLanguage);
  selectedLanguageRef.current = selectedLanguage;

  // Component State - Initialized with selected language greeting
  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    const initialLang: MitraLanguage =
      typeof window !== "undefined" &&
      (sessionStorage.getItem("mitra_session_language") as MitraLanguage)
        ? (sessionStorage.getItem("mitra_session_language") as MitraLanguage)
        : "English";
    return [getInitialGreetingMessage(initialLang, initialNeeds)];
  });
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [readinessScore, setReadinessScore] = useState(initialNeeds?.businessName ? 45 : 20);
  const [isReadyToBuild, setIsReadyToBuild] = useState(false);
  const [extractedNeeds, setExtractedNeeds] = useState<ExtractedUserNeeds>({
    features: ["whatsapp", "contact_form", "testimonials", "google_maps"],
    ...initialNeeds,
  });
  const [isBlueprintExpanded, setIsBlueprintExpanded] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // State refs to ensure async voice callbacks always access the freshest state
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const extractedNeedsRef = useRef(extractedNeeds);
  const isLoadingRef = useRef(isLoading);
  const isContinuousModeRef = useRef(isContinuousMode);
  const handleSendMessageRef = useRef<(text?: string) => Promise<void>>(() => Promise.resolve());
  const handleBuildWebsiteRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const hasConversationStartedRef = useRef(false);
  const hasSpokenInitialRef = useRef(false);
  const hasCompletedGreetingRef = useRef(false);
  const triggerNextVoiceTurnRef = useRef<() => void>(() => {});

  const handleLanguageChange = useCallback(
    (newLang: MitraLanguage) => {
      // Direct, synchronous resolution of target language and its greeting
      const nextLanguage = newLang;
      const config = getMitraLanguageConfig(nextLanguage);
      const nextGreeting = config.greeting;

      // 1. Update UI language state
      setSelectedLanguage(nextLanguage);
      selectedLanguageRef.current = nextLanguage;
      try {
        sessionStorage.setItem("mitra_session_language", nextLanguage);
      } catch {}

      setVoiceLanguage(config.code || "en-IN");
      console.log(`[MitraVoice] Language changed to: ${nextLanguage} (Locale: ${config.code})`);

      // 2. Determine if still in initial/welcome state
      const isWelcomeState = !hasConversationStartedRef.current && (
        messagesRef.current.length === 1 &&
        (messagesRef.current[0].id === "greeting" || messagesRef.current[0].role === "assistant")
      );

      if (isWelcomeState) {
        // Immediately update visible greeting message and suggested replies
        const updatedGreeting: AgentMessage = {
          ...messagesRef.current[0],
          id: "greeting",
          role: "assistant",
          content: nextGreeting,
          speechText: nextGreeting,
          suggestedReplies: config.suggestedReplies,
        };
        setMessages([updatedGreeting]);
        messagesRef.current = [updatedGreeting];

        // Explicitly cancel any previous greeting audio and trigger TTS for the new greeting
        hasCompletedGreetingRef.current = false;
        hasSpokenInitialRef.current = true;
        stopSpeaking();

        void speak(
          nextGreeting,
          nextLanguage,
          () => {
            hasCompletedGreetingRef.current = true;
            if (isContinuousModeRef.current) {
              setVoiceState("ready");
              setTimeout(() => {
                if (isContinuousModeRef.current) {
                  triggerNextVoiceTurnRef.current();
                }
              }, 350);
            }
          },
          () => {
            hasCompletedGreetingRef.current = true;
          },
          nextLanguage
        );
      } else {
        // Conversation has already started: preserve conversation history!
        console.log(`[MitraVoice] Mid-conversation language switch to ${nextLanguage}: Preserving ${messagesRef.current.length} messages.`);
      }
    },
    [setVoiceLanguage, speak, stopSpeaking, setVoiceState]
  );

  // Synchronize speech recognition locale with initial selected language
  useEffect(() => {
    const config = getMitraLanguageConfig(selectedLanguage);
    setVoiceLanguage(config.code || "en-IN");
  }, [selectedLanguage, setVoiceLanguage]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Continuous Conversational Voice Turn Progression - Auto-unmutes mic at user's turn
  const triggerNextVoiceTurn = useCallback(() => {
    if (!isContinuousModeRef.current) return;
    console.log("[VoiceTurn] 🎙️ User's turn: Auto-unmuting mic");
    startListening(
      (liveTranscript) => {
        setInputText(liveTranscript);
      },
      (finalTranscript) => {
        console.log(`[VoiceTurn] Hands-free speech completed -> auto-submitting: "${finalTranscript}"`);
        void handleSendMessageRef.current(finalTranscript);
      }
    );
  }, [startListening]);
  triggerNextVoiceTurnRef.current = triggerNextVoiceTurn;

  // Hands-Free Conversational Voice Activation (Requests mic permission & triggers loop)
  const startHandsFreeConversation = useCallback(async () => {
    unlockAudio();
    setIsContinuousMode(true);
    isContinuousModeRef.current = true;

    // Prompt browser for native mic permission on initial gesture
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr) {
        console.warn("[VoiceAgent] Native mic permission request caught:", permErr);
      }
    }

    if (!hasCompletedGreetingRef.current && !isSpeaking) {
      speak(
        INITIAL_GREETING.content,
        undefined,
        () => {
          hasCompletedGreetingRef.current = true;
          // Playback of initial greeting completed: automatically open mic and listen to user!
          if (isContinuousModeRef.current) {
            console.log("[VoiceTurn] Initial greeting completed. Auto-opening mic for user response!");
            setVoiceState("ready");
            setTimeout(() => {
              if (isContinuousModeRef.current) {
                triggerNextVoiceTurn();
              }
            }, 350);
          }
        },
        () => {
          hasCompletedGreetingRef.current = true;
        }
      );
    } else if (!isSpeaking) {
      triggerNextVoiceTurn();
    }
  }, [speak, triggerNextVoiceTurn, unlockAudio, setVoiceState, isSpeaking, setIsContinuousMode]);

  // User gesture unlock for Safari / WebKit Web Audio (no blocking mic prompts)
  useEffect(() => {
    const handleFirstGesture = () => {
      unlockAudio();
    };

    window.addEventListener("pointerdown", handleFirstGesture, { once: true });
    window.addEventListener("keydown", handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
    };
  }, [unlockAudio]);

  // Read initial greeting aloud once component mounts (if not muted and browser permits)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSpokenInitialRef.current && !hasCompletedGreetingRef.current && !hasConversationStartedRef.current) {
        hasSpokenInitialRef.current = true;
        const currentLang = selectedLanguageRef.current;
        const config = getMitraLanguageConfig(currentLang);
        void speak(
          config.greeting,
          currentLang,
          () => {
            hasCompletedGreetingRef.current = true;
            if (isContinuousModeRef.current) {
              setVoiceState("ready");
              setTimeout(() => {
                if (isContinuousModeRef.current) {
                  triggerNextVoiceTurnRef.current();
                }
              }, 350);
            }
          },
          () => {
            hasCompletedGreetingRef.current = true;
          },
          currentLang
        );
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [speak, setVoiceState]);

  // Handle Continuous Voice Mode Toggle with Automated Turn Progression
  const handleToggleVoiceRecord = () => {
    if (isListening || isContinuousMode || isSpeaking) {
      setIsContinuousMode(false);
      isContinuousModeRef.current = false;
      stopSpeaking();
      muteMic();
      setVoiceState("idle");
    } else {
      setIsContinuousMode(true);
      isContinuousModeRef.current = true;
      void startHandsFreeConversation();
    }
  };

  // Send message to API
  const handleSendMessage = async (textToSend?: string) => {
    const tSubmit = performance.now();
    console.log(`[VoiceLatency] Step 2: Agent request started`);
    unlockAudio();
    const rawText = typeof textToSend === "string" ? textToSend : inputText;
    const text = rawText.trim();
    if (!text || isLoadingRef.current) {
      if (isLoadingRef.current) {
        console.warn("[VoiceTurn] handleSendMessage skipped: agent is currently loading/processing.");
      }
      return;
    }

    // Explicit turn boundary: Mic is strictly AUTO-MUTED during thinking/speaking
    muteMic();
    stopSpeaking();
    hasConversationStartedRef.current = true;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messagesRef.current, userMsg];
    setMessages(newHistory);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/agent/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          currentNeeds: extractedNeedsRef.current,
          projectId,
          language: selectedLanguageRef.current,
        }),
      });

      const json = (await res.json()) as AgentTalkResponse;

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Failed to communicate with AI agent.");
      }

      const {
        reply,
        speechText,
        suggestedReplies,
        extractedNeeds: updatedNeeds,
        readinessScore: newScore,
        isReadyToBuild: ready,
      } = json.data;

      const canonicalText = (speechText || reply).trim();
      console.log("[VoiceDebug] agent response received");
      console.log(`[VoiceDebug] canonical text: "${canonicalText}"`);

      const agentMsg: AgentMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: canonicalText,
        speechText: canonicalText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedReplies,
        extractedNeeds: updatedNeeds,
      };

      setExtractedNeeds(updatedNeeds);
      setReadinessScore(newScore);
      setIsReadyToBuild(ready);

      console.log(`[VoiceParity] Response ID: ${agentMsg.id}`);
      console.log(`  UI displayed = "${canonicalText}"`);
      console.log(`  Voice spoken = "${canonicalText}"`);

      let hasRevealed = false;
      const revealMessage = () => {
        if (hasRevealed) return;
        hasRevealed = true;
        setMessages((prev) => [...prev, agentMsg]);
        setIsLoading(false);
        const tRevealed = performance.now();
        console.log(`[VoiceLatency] 0ms Synchronized Text Reveal at +${(tRevealed - tSubmit).toFixed(0)}ms`);
      };

      // Safety timer: If network audio stalls or takes > 2500ms, reveal text immediately
      const safetyTimer = setTimeout(() => {
        revealMessage();
      }, 2500);

      // Automatically speak Agent response via Google Gemini Speech
      speak(
        canonicalText,
        { tSubmit, tTextVisible: performance.now() },
        () => {
          // Playback finished callback: seamless progression to next turn
          if (json.data?.triggerImmediateBuild) {
            console.log("[VoiceTurn] Immediate build triggered! Launching website generator automatically...");
            void handleBuildWebsiteRef.current();
            return;
          }

          if (isContinuousModeRef.current) {
            console.log("[VoiceTurn] Agent finished speaking. Entering ready state.");
            setVoiceState("ready");
            // 350ms acoustic room clearance prevents self-capture of trailing echoes
            setTimeout(() => {
              if (isContinuousModeRef.current) {
                triggerNextVoiceTurn();
              }
            }, 350);
          } else {
            setVoiceState("idle");
          }
        },
        () => {
          // Playback START callback: The exact millisecond audio playback begins!
          clearTimeout(safetyTimer);
          revealMessage();
        },
        selectedLanguageRef.current
      );
    } catch (err) {
      toast.error(
        "Communication Error",
        err instanceof Error ? err.message : "Unable to reach the AI agent."
      );
      setVoiceState("error");
      setIsLoading(false);
    }
  };

  // Reset conversation
  const handleResetConversation = () => {
    stopSpeaking();
    if (isListening) stopListening();
    try {
      sessionStorage.removeItem("mitra_session_language");
    } catch {}
    hasConversationStartedRef.current = false;
    hasSpokenInitialRef.current = false;
    hasCompletedGreetingRef.current = false;
    setExtractedNeeds({
      features: ["whatsapp", "contact_form", "testimonials", "google_maps"],
      ...initialNeeds,
    });
    setReadinessScore(initialNeeds?.businessName ? 45 : 20);
    setIsReadyToBuild(false);
    setInputText("");
    handleLanguageChange("English");
  };

  // Hydrate Store and Launch Generator
  const handleBuildWebsite = async () => {
    setIsBuilding(true);
    stopSpeaking();
    if (isListening) stopListening();

    try {
      const finalBusinessName = extractedNeeds.businessName || "My Business";
      const finalCategory = extractedNeeds.category || "Other";
      const finalDescription = extractedNeeds.description || `${finalBusinessName} - ${finalCategory}`;
      const finalTargetAudience = extractedNeeds.targetAudience || "";
      const finalStyle = extractedNeeds.style || "Modern";
      const finalPrimaryColor = extractedNeeds.primaryColor || "#7C3AED";
      const finalSecondaryColor = extractedNeeds.secondaryColor || "#2563EB";
      const finalPhone = (extractedNeeds.whatsappNumber || extractedNeeds.phone || "").trim();
      const finalEmail = (extractedNeeds.email || "").trim();
      const finalFeatures =
        extractedNeeds.features && extractedNeeds.features.length > 0
          ? extractedNeeds.features
          : ["whatsapp", "contact_form", "testimonials", "google_maps"];

      // Update Zustand Store
      setBusinessName(finalBusinessName);
      setCategory(finalCategory);
      setDescription(finalDescription);
      setTargetAudience(finalTargetAudience);
      setStyle(finalStyle);
      setPrimaryColor(finalPrimaryColor);
      setSecondaryColor(finalSecondaryColor);
      setPhone(finalPhone);
      setEmail(finalEmail);
      if (finalPhone) {
        setWhatsappNumber(finalPhone);
        setWhatsappEnabled(true);
      }
      setSelectedFeatures(finalFeatures);

      if (onReadyToBuild) {
        onReadyToBuild(extractedNeeds);
        return;
      }

      // Verify authentication before project creation to handle guests gracefully
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsBuilding(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("wb_pending_project_needs", JSON.stringify(extractedNeeds));
        }
        toast.info("Account Required", "Please sign in or create a free account to generate and save your website.");
        router.push(`${loginRoute()}?redirectTo=${encodeURIComponent("/agent?autoGenerate=true")}`);
        return;
      }

      let targetId = projectId;

      if (targetId) {
        setProjectId(targetId);
        await updateProject(targetId, {
          name: finalBusinessName,
          business_name: finalBusinessName,
          category: finalCategory,
          description: finalDescription,
          target_audience: finalTargetAudience,
          style: finalStyle,
          primary_color: finalPrimaryColor,
          secondary_color: finalSecondaryColor,
          phone: finalPhone,
          email: finalEmail,
          selected_features: finalFeatures,
        });
      } else {
        const { data: newProj, error } = await createProject(finalBusinessName);
        if (error || !newProj) throw error || new Error("Failed to create project");
        targetId = newProj.id;
        setProjectId(targetId);
        await updateProject(targetId, {
          category: finalCategory,
          description: finalDescription,
          target_audience: finalTargetAudience,
          style: finalStyle,
          primary_color: finalPrimaryColor,
          secondary_color: finalSecondaryColor,
          phone: finalPhone,
          email: finalEmail,
          selected_features: finalFeatures,
        });
      }

      toast.success("Needs Understood!", "Launching AI Website Generator...");
      router.push(editorRoute(targetId, "loading"));
    } catch (err) {
      setIsBuilding(false);
      toast.error(
        "Build Error",
        err instanceof Error ? err.message : "Failed to proceed to website generation."
      );
    }
  };

  // Auto-resume generation after guest login redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("autoGenerate") === "true") {
      const savedNeedsRaw = localStorage.getItem("wb_pending_project_needs");
      if (savedNeedsRaw) {
        try {
          const parsedSaved = JSON.parse(savedNeedsRaw);
          if (parsedSaved && typeof parsedSaved === "object") {
            localStorage.removeItem("wb_pending_project_needs");
            void supabase.auth.getSession().then(({ data: { session } }) => {
              setExtractedNeeds((prev) => ({ ...prev, ...parsedSaved }));
              if (session) {
                setTimeout(() => {
                  void handleBuildWebsiteRef.current();
                }, 400);
              }
            });
          }
        } catch {
          // ignore parse error
        }
      }
    }
  }, []);

  // Synchronize latest references after render so async callbacks invoke current closures and state
  useEffect(() => {
    messagesRef.current = messages;
    extractedNeedsRef.current = extractedNeeds;
    isLoadingRef.current = isLoading;
    isContinuousModeRef.current = isContinuousMode;
    handleSendMessageRef.current = handleSendMessage;
    handleBuildWebsiteRef.current = handleBuildWebsite;
  });

  const visualVoiceState: "speaking" | "listening" | "thinking" | "idle" =
    voiceState === "speaking" || isSpeaking
      ? "speaking"
      : voiceState === "listening" || isListening
      ? "listening"
      : voiceState === "thinking" || isLoading
      ? "thinking"
      : "idle";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleOrbClick = () => {
    unlockAudio();
    if (visualVoiceState === "listening") {
      stopListening();
    } else if (visualVoiceState === "speaking") {
      stopSpeaking();
    } else {
      void startHandsFreeConversation();
    }
  };

  return (
    <div
      onPointerDown={unlockAudio}
      className={cn(
        "flex flex-col lg:flex-row gap-6 lg:gap-8 w-full rounded-3xl bg-white/95 dark:bg-[#0c0e14] border border-zinc-200/90 dark:border-white/10 shadow-2xl backdrop-blur-xl",
        variant === "fullscreen" && "min-h-[85vh] p-5 sm:p-7 lg:p-8",
        variant === "modal" && "max-h-[88vh] p-4 sm:p-6",
        variant === "embedded" && "p-5 sm:p-7 lg:p-8",
        className
      )}
    >
      {/* ======================================================== */}
      {/* LEFT COLUMN: Alive Animated AI Orb + Voice Agent Controls + Needs & Blueprint */}
      {/* ======================================================== */}
      <div className="w-full lg:w-[410px] xl:w-[440px] shrink-0 flex flex-col justify-between items-center lg:border-r lg:border-zinc-200/80 lg:dark:border-white/10 lg:pr-7 pb-6 lg:pb-0">
        <div className="w-full flex flex-col items-center">
          {/* Header pill for Mobile/Desktop */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Mitra Voice AI Core
              </span>
            </div>
            {/* User-Selectable Language Dropdown (Default: English) */}
            <div className="relative inline-flex items-center">
              <label htmlFor="mitra-language-select" className="sr-only">
                Conversation Language
              </label>
              <div className="flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full border border-cyan-500/30 bg-cyan-50/70 dark:border-cyan-500/30 dark:bg-cyan-950/40 text-[11px] font-medium text-cyan-800 dark:text-cyan-200 shadow-2xs transition hover:border-cyan-500/50">
                <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <select
                  id="mitra-language-select"
                  aria-label="Select conversation language"
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value as MitraLanguage)}
                  className="bg-transparent border-0 text-[11px] font-semibold text-cyan-950 dark:text-cyan-200 focus:outline-hidden cursor-pointer pr-1 py-0.5"
                >
                  {MITRA_LANGUAGE_LIST.map((lang) => (
                    <option
                      key={lang.id}
                      value={lang.id}
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                    >
                      {lang.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Central Alive AI Orb Visualizer */}
          <AiOrbVisualizer
            state={visualVoiceState}
            isVoiceMuted={isVoiceMuted}
            onOrbClick={handleOrbClick}
            onStopSpeaking={stopSpeaking}
          />

          {/* Voice State Badge */}
          <div className="mt-3 flex items-center justify-center">
            {visualVoiceState === "listening" && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold text-xs animate-pulse shadow-sm">
                <Mic className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>🎙️ Listening to you... (Speak naturally)</span>
              </div>
            )}
            {visualVoiceState === "thinking" && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-bold text-xs shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span>🧠 Synthesizing website architecture...</span>
              </div>
            )}
            {visualVoiceState === "speaking" && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/50 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 font-bold text-xs shadow-sm">
                <Volume2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>🔊 Mitra speaking...</span>
                <button
                  type="button"
                  onClick={stopSpeaking}
                  title="Stop voice playback"
                  className="ml-1 px-1.5 py-0.5 rounded bg-violet-200 dark:bg-violet-900/60 text-[10px] text-violet-900 dark:text-violet-200 cursor-pointer"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              </div>
            )}
            {visualVoiceState === "idle" && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 font-medium text-xs shadow-xs">
                <Sparkles className="h-3 w-3 text-violet-500" />
                <span>Tap Orb or Mic to talk with Mitra</span>
              </div>
            )}
          </div>

          {/* Quick Voice Controls Bar */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {/* Start Hands-Free Voice Button */}
            <button
              type="button"
              onClick={handleToggleVoiceRecord}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer",
                isListening
                  ? "bg-emerald-600 text-white animate-pulse ring-2 ring-emerald-400"
                  : isContinuousMode
                  ? "bg-violet-600 text-white ring-2 ring-violet-400"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              <Mic className="h-3.5 w-3.5" />
              <span>{isListening ? "Listening..." : "Hands-Free Voice"}</span>
            </button>

            {/* Mute Voice Output */}
            <button
              type="button"
              onClick={toggleMute}
              title={isVoiceMuted ? "Unmute Voice" : "Mute Voice"}
              className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
            >
              {isVoiceMuted ? <VolumeX className="h-3.5 w-3.5 text-zinc-400" /> : <Volume2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
            </button>

            {/* Reset Conversation */}
            <button
              type="button"
              onClick={handleResetConversation}
              title="Reset Conversation"
              className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Readiness Meter Card */}
          <div className="w-full mt-4 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1">
                <Sliders className="h-3 w-3" />
                Needs Understanding
              </span>
              <span className="text-xs font-extrabold text-violet-700 dark:text-violet-400">
                {readinessScore}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600"
                initial={{ width: "20%" }}
                animate={{ width: `${readinessScore}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5">
              {readinessScore < 40
                ? "Exploring business concept & category..."
                : readinessScore < 70
                ? "Defining offerings, audience, & brand voice..."
                : "Complete architecture synthesized! Ready to generate."}
            </p>
          </div>

          {/* Collapsible Architecture Blueprint Summary */}
          <div className="w-full mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-violet-600" />
                Architecture Blueprint
              </h4>
              <button
                type="button"
                onClick={() => setIsBlueprintExpanded((p) => !p)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 cursor-pointer"
              >
                {isBlueprintExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            <AnimatePresence>
              {isBlueprintExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden text-xs"
                >
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-2.5 dark:border-white/5 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-medium mb-0.5">
                      <Briefcase className="h-3 w-3" />
                      <span>Business & Category</span>
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white text-xs">
                      {extractedNeeds.businessName || "Pending conversation..."}
                    </div>
                    {extractedNeeds.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 text-[10px] font-semibold">
                        {extractedNeeds.category}
                      </span>
                    )}
                  </div>

                  {extractedNeeds.targetAudience && (
                    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-2.5 dark:border-white/5 dark:bg-zinc-900/40">
                      <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-medium mb-0.5">
                        <Target className="h-3 w-3" />
                        <span>Target Audience</span>
                      </div>
                      <div className="text-zinc-700 dark:text-zinc-300 font-medium text-xs">
                        {extractedNeeds.targetAudience}
                      </div>
                    </div>
                  )}

                  {extractedNeeds.services && extractedNeeds.services.length > 0 && (
                    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-2.5 dark:border-white/5 dark:bg-zinc-900/40">
                      <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-medium mb-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>Curated Offerings</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {extractedNeeds.services.map((srv, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-300 text-[10px]"
                          >
                            {srv}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-2.5 dark:border-white/5 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-zinc-500 text-[10px] font-medium">
                        <Palette className="h-3 w-3" />
                        <span>Vibe & Colors</span>
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[10px]">
                        {extractedNeeds.style || "Modern"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: extractedNeeds.primaryColor || "#7C3AED" }}
                        />
                        <span className="font-mono text-[10px] text-zinc-500">
                          {extractedNeeds.primaryColor || "#7C3AED"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: extractedNeeds.secondaryColor || "#2563EB" }}
                        />
                        <span className="font-mono text-[10px] text-zinc-500">
                          {extractedNeeds.secondaryColor || "#2563EB"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="w-full pt-4 border-t border-zinc-200/80 dark:border-white/10 mt-4">
          <button
            type="button"
            disabled={isBuilding || !isReadyToBuild}
            onClick={() => void handleBuildWebsite()}
            className={cn(
              "w-full py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.98]",
              isReadyToBuild
                ? "bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 text-white shadow-violet-500/25 hover:opacity-95 cursor-pointer animate-pulse"
                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed opacity-60"
            )}
          >
            {isBuilding ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Generating Website in Studio...</span>
              </>
            ) : isReadyToBuild ? (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate Website in Studio</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Requirements Pending ({readinessScore}% / 70%)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: Modern Compact Chat Panel */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-[520px] lg:min-h-[580px] h-full justify-between lg:pl-3">
        {/* Agent Header Controls */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              {isSpeaking && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-600" />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Mitra — AI Website Architect
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Voice & Chat
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Speaks aloud & understands your business requirements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetConversation}
              title="Reset Conversation"
              className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-[360px] max-h-[520px] pr-2 scroll-smooth">
          {messages.map((msg) => {
            const isAgent = msg.role === "assistant";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex flex-col", isAgent ? "items-start" : "items-end")}
              >
                <div className="flex items-end gap-2 max-w-[92%] sm:max-w-[85%]">
                  {isAgent && (
                    <div className="h-7 w-7 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 mb-1 shadow-xs text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    data-role={isAgent ? "assistant-message" : "user-message"}
                    className={cn(
                      "rounded-3xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs relative group",
                      isAgent
                        ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/5"
                        : "bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10"
                    )}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>

                    {/* Replay Voice Speaker Button on Agent messages */}
                    {isAgent && (
                      <button
                        type="button"
                        onClick={() => {
                          unlockAudio();
                          speak(msg.content, undefined, undefined, undefined, selectedLanguageRef.current);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Replay Voice</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Suggested Replies Chips */}
                {isAgent && msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-9 max-w-full">
                    {msg.suggestedReplies.map((reply, index) => (
                      <button
                        key={index}
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleSendMessage(reply)}
                        className="text-xs px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/40 text-violet-700 dark:text-violet-300 font-medium hover:bg-violet-100 dark:hover:bg-violet-900/60 transition active:scale-95 disabled:opacity-50 cursor-pointer text-left"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 pl-9 text-xs text-zinc-500"
            >
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-violet-600 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-violet-600 animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-violet-600 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                Mitra is thinking & synthesizing...
              </span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Controls Bar */}
        <div className="pt-3 border-t border-zinc-200/80 dark:border-white/10">
          {voiceError && (
            <div className="mb-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <MicOff className="h-3.5 w-3.5 text-amber-500" />
              <span>{voiceError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/80 p-2 shadow-inner">
            <textarea
              data-testid="agent-textarea"
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              placeholder={
                isListening
                  ? "Listening to your voice..."
                  : "Tell Mitra about your business, vision, or desired style..."
              }
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none max-h-24 min-h-[36px]"
            />

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {inputText.trim() && (
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                  title="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Mic Button */}
              {isVoiceSupported && (
                <button
                  type="button"
                  data-testid="voice-record-btn"
                  onClick={handleToggleVoiceRecord}
                  title={
                    isListening
                      ? "Mic is active (Listening). Tap to pause."
                      : "Tap to speak with Mitra"
                  }
                  className={cn(
                    "p-2 rounded-xl transition flex items-center justify-center cursor-pointer",
                    isListening
                      ? "bg-emerald-600 text-white animate-pulse shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50"
                      : isContinuousMode
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/30 ring-2 ring-violet-400/50"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400"
                  )}
                >
                  {isListening ? (
                    <Mic className="h-4 w-4 text-white" />
                  ) : (
                    <Mic className="h-4 w-4 text-zinc-500" />
                  )}
                </button>
              )}

              {/* Send Button */}
              <button
                type="button"
                data-testid="send-message-btn"
                disabled={!inputText.trim() || isLoading}
                onClick={() => void handleSendMessage()}
                className="p-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition shadow-md shadow-violet-500/20 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
