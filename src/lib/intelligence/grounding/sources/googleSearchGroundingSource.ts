// src/lib/intelligence/grounding/sources/googleSearchGroundingSource.ts
// Grounded Business Intelligence — Google Search Grounding Adapter
// Clean provider boundary for search grounding. If GEMINI_API_KEY is configured and search
// grounding is supported, queries external search context; otherwise degrades gracefully.
// Never fabricates search results or citations.

import { GoogleGenAI } from "@google/genai";
import { createEvidenceItem } from "../evidenceEngine";
import type { EvidenceItem } from "../types";

export interface GoogleSearchGroundedData {
  isAvailable: boolean;
  queriesRun: string[];
  findings: string[];
  citations: string[];
  evidence: EvidenceItem[];
  error?: string;
}

export class GoogleSearchGroundingSource {
  private static instance: GoogleSearchGroundingSource;

  private constructor() {}

  public static getInstance(): GoogleSearchGroundingSource {
    if (!GoogleSearchGroundingSource.instance) {
      GoogleSearchGroundingSource.instance = new GoogleSearchGroundingSource();
    }
    return GoogleSearchGroundingSource.instance;
  }

  public isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY?.trim();
    return Boolean(key && !key.includes("<") && key !== "placeholder");
  }

  /**
   * Performs an evidence-grounded search query for real business context.
   */
  public async groundQuery(params: {
    businessName: string;
    location?: string;
  }): Promise<GoogleSearchGroundedData> {
    if (!this.isConfigured()) {
      return {
        isAvailable: false,
        queriesRun: [],
        findings: [],
        citations: [],
        evidence: [],
        error: "Google Search grounding is not configured (GEMINI_API_KEY missing).",
      };
    }

    const query = params.location
      ? `Verify business services, address, and presence for ${params.businessName} in ${params.location}`
      : `Verify business services and presence for ${params.businessName}`;

    const apiKey = process.env.GEMINI_API_KEY!.trim();

    try {
      const client = new GoogleGenAI({ apiKey, vertexai: false });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);

      const response = await Promise.race([
        client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Identify factual information about this real business: "${query}". State only verifiable observed facts: services, location, and web presence. If you do not know or cannot verify, explicitly state "NO_VERIFIED_DATA".`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            // Google Search tool enables search grounding in Google GenAI SDK
            tools: [{ googleSearch: {} } as any],
          },
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Search grounding request timed out")), 7000);
        }),
      ]);

      clearTimeout(timer);

      const text = response.text || "";
      if (!text || text.includes("NO_VERIFIED_DATA")) {
        return {
          isAvailable: true,
          queriesRun: [query],
          findings: [],
          citations: [],
          evidence: [],
        };
      }

      // Extract search grounding metadata if provided by Gemini
      const metadata = (response as any).candidates?.[0]?.groundingMetadata;
      const webSearchQueries: string[] = metadata?.webSearchQueries || [query];
      const searchChunks: Array<{ web?: { uri?: string; title?: string } }> =
        metadata?.groundingChunks || [];

      const citations = searchChunks
        .map((c) => c.web?.uri)
        .filter((uri): uri is string => Boolean(uri));

      const evidence: EvidenceItem[] = [];
      const cleanSummary = text.slice(0, 400).trim();

      if (cleanSummary) {
        evidence.push(
          createEvidenceItem({
            source: "google_search",
            reference: citations[0] || `search:${query}`,
            observation: cleanSummary,
            supports: "services",
            baseConfidence: 0.75,
            verificationStatus: "inferred",
          })
        );
      }

      return {
        isAvailable: true,
        queriesRun: webSearchQueries,
        findings: [cleanSummary],
        citations,
        evidence,
      };
    } catch (err) {
      return {
        isAvailable: false,
        queriesRun: [query],
        findings: [],
        citations: [],
        evidence: [],
        error: err instanceof Error ? err.message : "Error executing search grounding",
      };
    }
  }
}

export const googleSearchGroundingSource = GoogleSearchGroundingSource.getInstance();
