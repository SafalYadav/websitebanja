"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useBuilderStore } from "@/store/builderStore";
import { createProject, updateProject } from "@/lib/projects";
import { editorRoute } from "@/lib/editorRoutes";
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

interface AiTalkingAgentProps {
  projectId?: string;
  initialNeeds?: Partial<ExtractedUserNeeds>;
  onReadyToBuild?: (needs: ExtractedUserNeeds) => void;
  className?: string;
  variant?: "embedded" | "modal" | "fullscreen";
}

const CANONICAL_INITIAL_GREETING =
  "Hey there! I'm Mitra, your AI Website Architect. What kind of business or website are you building today? Tell me your vision, or tap the mic and let's chat!";

const INITIAL_GREETING: AgentMessage = {
  id: "greeting",
  role: "assistant",
  content: CANONICAL_INITIAL_GREETING,
  speechText: CANONICAL_INITIAL_GREETING,
  timestamp: "Just now",
  suggestedReplies: [
    "Specialty Coffee Cafe & Roastery",
    "Modern Fitness & CrossFit Gym",
    "Digital Marketing & Creative Agency",
    "Luxury Hair & Beauty Salon",
    "Doctor / Dental Healthcare Clinic",
  ],
  extractedNeeds: {
    features: ["whatsapp", "contact_form", "testimonials", "google_maps"],
  },
};

export default function AiTalkingAgent({
  projectId,
  initialNeeds,
  onReadyToBuild,
  className,
  variant = "embedded",
}: AiTalkingAgentProps) {
  const router = useRouter();

  // Builder store bindings
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
    isLoadingVoice,
    voiceState,
    setVoiceState,
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
  } = useVoiceAgent();

  // Automatic Language Detection State
  const [autoDetectedLang, setAutoDetectedLang] = useState<{
    code: string;
    name: string;
    nativeName?: string;
  } | null>(null);

  // Component State
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      ...INITIAL_GREETING,
      extractedNeeds: {
        ...INITIAL_GREETING.extractedNeeds,
        ...initialNeeds,
      },
    },
  ]);
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
  extractedNeedsRef.current = extractedNeeds;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;
  const isContinuousModeRef = useRef(isContinuousMode);
  isContinuousModeRef.current = isContinuousMode;
  const handleSendMessageRef = useRef<(text?: string) => Promise<void>>(() => Promise.resolve());
  const handleBuildWebsiteRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const hasSpokenInitialRef = useRef(false);

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

    if (!hasSpokenInitialRef.current) {
      hasSpokenInitialRef.current = true;
      speak(
        INITIAL_GREETING.speechText || INITIAL_GREETING.content,
        undefined,
        () => {
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
        }
      );
    } else if (!isSpeaking) {
      triggerNextVoiceTurn();
    }
  }, [speak, triggerNextVoiceTurn, unlockAudio, setVoiceState, isSpeaking]);

  // User gesture unlock for Safari / WebKit Web Audio
  useEffect(() => {
    const handleFirstGesture = () => {
      void startHandsFreeConversation();
    };

    window.addEventListener("pointerdown", handleFirstGesture, { once: true });
    window.addEventListener("keydown", handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
    };
  }, [startHandsFreeConversation]);

  // Read initial greeting aloud once component mounts (if not muted and browser permits)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSpokenInitialRef.current) {
        hasSpokenInitialRef.current = true;
        speak(
          INITIAL_GREETING.speechText || INITIAL_GREETING.content,
          undefined,
          () => {
            if (isContinuousModeRef.current) {
              setVoiceState("ready");
              setTimeout(() => {
                if (isContinuousModeRef.current) {
                  triggerNextVoiceTurn();
                }
              }, 350);
            }
          }
        );
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [speak, triggerNextVoiceTurn, setVoiceState]);

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
        detectedLanguage,
      } = json.data;

      if (detectedLanguage) {
        setAutoDetectedLang(detectedLanguage);
      }

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

      // Automatically speak Agent response via Gemini Live streaming
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
        }
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
    setAutoDetectedLang(null);
    setMessages([INITIAL_GREETING]);
    setExtractedNeeds({
      features: ["whatsapp", "contact_form", "testimonials", "google_maps"],
      ...initialNeeds,
    });
    setReadinessScore(20);
    setIsReadyToBuild(false);
    setInputText("");
    speak(INITIAL_GREETING.speechText || INITIAL_GREETING.content);
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

      let targetId = projectId;

      if (targetId) {
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

  // Synchronize latest function references on every render so async callbacks invoke current closures
  handleSendMessageRef.current = handleSendMessage;
  handleBuildWebsiteRef.current = handleBuildWebsite;

  return (
    <div
      onPointerDown={unlockAudio}
      className={cn(
        "flex flex-col lg:flex-row gap-6 w-full rounded-3xl bg-white/90 dark:bg-zinc-950/90 border border-zinc-200/90 dark:border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden",
        variant === "fullscreen" && "min-h-[85vh] p-6 sm:p-8",
        variant === "modal" && "max-h-[88vh] p-4 sm:p-6",
        variant === "embedded" && "p-4 sm:p-6",
        className
      )}
    >
      {/* Left Chat Area */}
      <div className="flex-1 flex flex-col min-h-[500px] h-full justify-between">
        {/* Agent Header Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              {isSpeaking && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-violet-600" />
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
            {/* 🎙️ Listening State (User Turn: Mic Auto-Unmuted) */}
            {(voiceState === "listening" || isListening) && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs animate-pulse">
                <Mic className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>🎙️ Mic Auto-Unmuted (Your Turn)</span>
              </div>
            )}

            {/* 🧠 Thinking State (Mic Auto-Muted) */}
            {(voiceState === "thinking" || isLoading) && !(voiceState === "speaking" || isSpeaking) && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span>🧠 Thinking</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 font-medium text-[11px]">
                  <MicOff className="h-3 w-3 text-red-500" />
                  <span>Mic Auto-Muted</span>
                </div>
              </div>
            )}

            {/* 🔊 Speaking State (Agent Speaking: Mic Auto-Muted) */}
            {(voiceState === "speaking" || isSpeaking) && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 text-violet-700 dark:text-violet-300 font-semibold text-xs">
                  <motion.span
                    animate={{ height: ["4px", "14px", "4px"] }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                    className="w-1 bg-violet-600 rounded-full inline-block"
                  />
                  <motion.span
                    animate={{ height: ["8px", "18px", "6px"] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                    className="w-1 bg-violet-600 rounded-full inline-block"
                  />
                  <motion.span
                    animate={{ height: ["4px", "16px", "4px"] }}
                    transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }}
                    className="w-1 bg-violet-600 rounded-full inline-block"
                  />
                  <span className="ml-1">🔊 Speaking</span>
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    title="Stop voice playback"
                    className="ml-1.5 p-0.5 rounded-md text-violet-600 hover:text-red-500 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition cursor-pointer"
                  >
                    <Square className="h-3 w-3 fill-current" />
                  </button>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 font-medium text-xs">
                  <MicOff className="h-3 w-3 text-red-500" />
                  <span>Mic Auto-Muted</span>
                </div>
              </div>
            )}

            {/* ✅ Ready For Next Turn State (Auto-unmuting) */}
            {voiceState === "ready" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>🎙️ Auto-unmuting mic for you...</span>
              </div>
            )}

            {/* Automatic Multi-Language Indicator Badge */}
            <div
              title="Automatic Multi-Language: Speaks and understands Hindi, Gujarati, Tamil, Marathi, Bengali, Hinglish, English, etc."
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-violet-200/70 dark:border-violet-800/40 bg-violet-50/80 dark:bg-violet-950/40 text-xs font-semibold text-violet-700 dark:text-violet-300 shadow-xs select-none"
            >
              <Globe className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              <span>
                {autoDetectedLang
                  ? `${autoDetectedLang.nativeName || autoDetectedLang.name} (Auto)`
                  : "Auto: Any Indian Language"}
              </span>
            </div>

            {/* Mute/Unmute Speech Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              title={isVoiceMuted ? "Unmute Voice" : "Mute Voice"}
              className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition"
            >
              {isVoiceMuted ? <VolumeX className="h-4 w-4 text-zinc-400" /> : <Volume2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
            </button>

            {/* Reset Dialogue */}
            <button
              type="button"
              onClick={handleResetConversation}
              title="Reset Conversation"
              className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[420px] pr-2 scroll-smooth">
          {messages.map((msg) => {
            const isAgent = msg.role === "assistant";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex flex-col", isAgent ? "items-start" : "items-end")}
              >
                <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[80%]">
                  {isAgent && (
                    <div className="h-7 w-7 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 mb-1 shadow-xs text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
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
                          speak(msg.speechText || msg.content);
                        }}
                        className="mt-2 text-[11px] text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1 transition"
                        title="Listen to this response"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Listen again</span>
                      </button>
                    )}
                  </div>
                </div>

                <span className="text-[10px] text-zinc-400 mt-1 px-2">{msg.timestamp}</span>

                {/* Suggested Reply Chips below latest agent message */}
                {isAgent && msg.suggestedReplies && msg.suggestedReplies.length > 0 && msg === messages[messages.length - 1] && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[95%]">
                    {msg.suggestedReplies.map((replyText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleSendMessage(replyText)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 hover:border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/40 dark:hover:bg-violet-900/50 transition cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {replyText}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 text-violet-600 dark:text-violet-300 text-xs w-fit shadow-xs"
            >
              <div className="flex items-center gap-1">
                <motion.span
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  className="h-2 w-2 rounded-full bg-violet-600"
                />
                <motion.span
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  className="h-2 w-2 rounded-full bg-violet-600"
                />
                <motion.span
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  className="h-2 w-2 rounded-full bg-violet-600"
                />
              </div>
              <span className="font-medium">Mitra is thinking and preparing response...</span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Voice Controls */}
        <div className="pt-3 border-t border-zinc-200/80 dark:border-white/10 space-y-2">
          {voiceError && (
            <p className="text-[11px] text-red-500 font-medium px-2">{voiceError}</p>
          )}

          {/* Active Conversational Voice Banner */}
          {isContinuousMode ? (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-violet-700 dark:text-violet-300">
                {isSpeaking ? (
                  <>
                    <MicOff className="h-3.5 w-3.5 text-red-500" />
                    <span>🔇 Mic Auto-Muted while Mitra speaks • Will auto-unmute for your turn</span>
                  </>
                ) : isListening ? (
                  <>
                    <Mic className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                    <span>🎙️ Mic Auto-Unmuted • Speak your answer (auto-sends on silence)</span>
                  </>
                ) : voiceState === "thinking" || isLoading ? (
                  <>
                    <MicOff className="h-3.5 w-3.5 text-zinc-400" />
                    <span>🔇 Mic Auto-Muted • Analyzing requirements & reasoning...</span>
                  </>
                ) : voiceState === "ready" ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>🎙️ Auto-unmuting mic for your turn...</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
                    <span>Hands-Free Voice Active • Auto-unmutes at your turn</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={handleToggleVoiceRecord}
                className="text-[11px] font-semibold text-violet-600 hover:text-red-500 transition underline cursor-pointer"
              >
                Pause Voice
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void startHandsFreeConversation()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium text-xs shadow-md shadow-violet-500/20 transition cursor-pointer"
            >
              <Mic className="h-3.5 w-3.5 animate-pulse" />
              <span>🎙️ Tap to Start Hands-Free Voice Conversation</span>
            </button>
          )}

          <div className="relative flex items-center gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder={
                isSpeaking
                  ? "🔊 Mitra is speaking... (Mic auto-muted)"
                  : isListening || voiceState === "listening"
                  ? "🎙️ Mic auto-unmuted • Speak now (auto-sends on pause)"
                  : voiceState === "thinking" || isLoading
                  ? "🧠 Mitra is thinking... (Mic auto-muted)"
                  : voiceState === "ready"
                  ? "🎙️ Auto-unmuting mic for your turn..."
                  : isContinuousMode
                  ? "🎙️ Hands-free mode active • Auto-unmutes at your turn"
                  : "Type your answer or tap mic to start conversational voice..."
              }
              className={cn(
                "flex-1 rounded-2xl border bg-white dark:bg-zinc-900 p-3 pr-24 text-xs sm:text-sm text-zinc-900 dark:text-white outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 resize-none placeholder:text-zinc-400",
                voiceState === "listening"
                  ? "border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/20"
                  : voiceState === "thinking"
                  ? "border-amber-500/50 bg-amber-50/10"
                  : voiceState === "speaking"
                  ? "border-violet-500/50 bg-violet-50/10"
                  : voiceState === "ready"
                  ? "border-emerald-500/50 bg-emerald-50/10"
                  : "border-zinc-200 dark:border-white/10"
              )}
            />

            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
              {/* Cancel Button */}
              {(isListening || inputText.trim().length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) cancelListening();
                    setInputText("");
                  }}
                  title={isListening ? "Cancel recording" : "Clear text"}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Mic Conversational Mode Button */}
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={handleToggleVoiceRecord}
                  title={
                    isListening
                      ? "Mic is unmuted & listening (Your Turn). Tap to pause."
                      : isSpeaking
                      ? "Mic is auto-muted while Mitra speaks."
                      : "Tap to start hands-free voice."
                  }
                  className={cn(
                    "p-2 rounded-xl transition flex items-center justify-center cursor-pointer",
                    isListening
                      ? "bg-emerald-600 text-white animate-pulse shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50"
                      : isSpeaking
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-80"
                      : isContinuousMode
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/30 ring-2 ring-violet-400/50"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400"
                  )}
                >
                  {isListening ? (
                    <Mic className="h-4 w-4 text-white" />
                  ) : (
                    <MicOff className="h-4 w-4 text-zinc-400" />
                  )}
                </button>
              )}

              {/* Send Button */}
              <button
                type="button"
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

      {/* Right "Understood Needs" & Blueprint HUD */}
      <div className="w-full lg:w-84 xl:w-96 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-zinc-200/80 dark:border-white/10 pt-4 lg:pt-0 lg:pl-6">
        <div>
          {/* Readiness Meter Card */}
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
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
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
              {readinessScore < 40
                ? "Exploring business concept & category..."
                : readinessScore < 70
                ? "Defining offerings, audience, & brand voice..."
                : "Complete architecture synthesized! Ready to generate."}
            </p>
          </div>

          {/* Toggleable Blueprint Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-violet-600" />
                Live Architecture Blueprint
              </h4>
              <button
                type="button"
                onClick={() => setIsBlueprintExpanded((p) => !p)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1"
              >
                {isBlueprintExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            <AnimatePresence>
              {isBlueprintExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden text-xs"
                >
                  {/* Business Name & Category */}
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-white/5 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium mb-1">
                      <Briefcase className="h-3 w-3" />
                      <span>Business & Category</span>
                    </div>
                    <div className="font-bold text-zinc-900 dark:text-white">
                      {extractedNeeds.businessName || "Pending conversation..."}
                    </div>
                    {extractedNeeds.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 text-[10px] font-semibold">
                        {extractedNeeds.category}
                      </span>
                    )}
                  </div>

                  {/* Target Audience */}
                  {extractedNeeds.targetAudience && (
                    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-white/5 dark:bg-zinc-900/40">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium mb-1">
                        <Target className="h-3 w-3" />
                        <span>Target Audience</span>
                      </div>
                      <div className="text-zinc-700 dark:text-zinc-300 font-medium">
                        {extractedNeeds.targetAudience}
                      </div>
                    </div>
                  )}

                  {/* Services & Offerings */}
                  {extractedNeeds.services && extractedNeeds.services.length > 0 && (
                    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-white/5 dark:bg-zinc-900/40">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium mb-1.5">
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

                  {/* Style & Palette */}
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-white/5 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium">
                        <Palette className="h-3 w-3" />
                        <span>Vibe & Colors</span>
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px]">
                        {extractedNeeds.style || "Modern"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: extractedNeeds.primaryColor || "#7C3AED" }}
                        />
                        <span className="font-mono text-[10px] text-zinc-500">
                          {extractedNeeds.primaryColor || "#7C3AED"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-4 w-4 rounded-full border border-black/10"
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

        {/* Primary Action Button - Enabled strictly when ready_to_generate is achieved */}
        <div className="pt-4 border-t border-zinc-200/80 dark:border-white/10">
          <button
            type="button"
            disabled={isBuilding || !isReadyToBuild}
            onClick={() => void handleBuildWebsite()}
            className={cn(
              "w-full py-4 px-6 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.98]",
              isReadyToBuild
                ? "bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 text-white shadow-violet-500/25 hover:opacity-95 cursor-pointer animate-pulse"
                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed opacity-60"
            )}
          >
            {isBuilding ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Generating Website...</span>
              </>
            ) : isReadyToBuild ? (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate Website Now</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Requirements Pending ({readinessScore}% / 70%)</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-center text-zinc-400 mt-2">
            {isReadyToBuild
              ? "All requirements synthesized! Click above to launch website generation."
              : "Continue answering Mitra's questions to unlock the website generator."}
          </p>
        </div>
      </div>
    </div>
  );
}
