export interface ExtractedUserNeeds {
  businessName?: string;
  category?: string;
  description?: string;
  targetAudience?: string;
  services?: string[];
  features?: string[];
  style?: string;
  primaryColor?: string;
  secondaryColor?: string;
  phone?: string;
  email?: string;
  whatsappNumber?: string;
  location?: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  speechText?: string;
  timestamp: string;
  suggestedReplies?: string[];
  extractedNeeds?: Partial<ExtractedUserNeeds>;
  isVoiceInput?: boolean;
}

export interface AgentTalkResponse {
  success: boolean;
  data?: {
    reply: string;
    speechText: string;
    suggestedReplies: string[];
    extractedNeeds: ExtractedUserNeeds;
    readinessScore: number; // 0 to 100
    isReadyToBuild: boolean;
    triggerImmediateBuild?: boolean;
    nextMissingAspect?: string;
    detectedLanguage?: {
      code: string;
      name: string;
      nativeName?: string;
    };
  };
  message?: string;
}
