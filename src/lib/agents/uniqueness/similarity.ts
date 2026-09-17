// src/lib/agents/uniqueness/similarity.ts
import type { DesignFingerprint } from "@/lib/agents/skills/types";
import type {
  CandidateWebsite,
  SimilarityBreakdown,
  SimilarityWeights,
  UniquenessStatus,
  UniquenessThresholdConfig,
} from "./types";
import { DEFAULT_UNIQUENESS_CONFIG } from "./types";
import { extractDetailedDesignFingerprint, type DetailedDesignFingerprint } from "./fingerprint";

/**
 * Calculates normalized Jaccard similarity between two string arrays [0.0, 1.0].
 */
export function calculateJaccardSimilarity(arrA: string[], arrB: string[]): number {
  if (arrA.length === 0 && arrB.length === 0) return 1.0;
  const setA = new Set(arrA.map((s) => s.toLowerCase().trim()));
  const setB = new Set(arrB.map((s) => s.toLowerCase().trim()));

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculates normalized Levenshtein sequence similarity for ordered section sequences [0.0, 1.0].
 */
export function calculateSequenceSimilarity(seqA: string[], seqB: string[]): number {
  if (seqA.length === 0 && seqB.length === 0) return 1.0;
  if (seqA.length === 0 || seqB.length === 0) return 0.0;

  const m = seqA.length;
  const n = seqB.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = seqA[i - 1].toLowerCase() === seqB[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = dp[m][n];
  const maxLen = Math.max(m, n);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Layer 1: Deterministic Structural Similarity Check
 */
export function calculateStructuralSimilarity(
  targetFp: DetailedDesignFingerprint,
  candidateFp: DesignFingerprint & Partial<DetailedDesignFingerprint>
): number {
  // 1. Section order sequence similarity (weight 0.40)
  const seqSim = calculateSequenceSimilarity(targetFp.sectionOrder, candidateFp.sectionOrder);

  // 2. Section types overlap (weight 0.25)
  const targetTypes = targetFp.sectionTypes || targetFp.sectionOrder;
  const candidateTypes = candidateFp.sectionTypes || candidateFp.sectionOrder;
  const typeOverlap = calculateJaccardSimilarity(targetTypes, candidateTypes);

  // 3. Hero layout matching (weight 0.20)
  const heroMatch =
    targetFp.heroType.toLowerCase().trim() === candidateFp.heroType.toLowerCase().trim() ? 1.0 : 0.0;

  // 4. Navigation matching (weight 0.15)
  const navMatch =
    targetFp.navigationType.toLowerCase().trim() === candidateFp.navigationType.toLowerCase().trim() ? 1.0 : 0.0;

  const structuralScore = seqSim * 0.4 + typeOverlap * 0.25 + heroMatch * 0.2 + navMatch * 0.15;
  return Math.min(1.0, Math.max(0.0, structuralScore));
}

/**
 * Calculates Design Fingerprint Similarity across visual and layout attributes.
 */
export function calculateFingerprintSimilarity(
  targetFp: DetailedDesignFingerprint,
  candidateFp: DesignFingerprint & Partial<DetailedDesignFingerprint>
): number {
  let matches = 0;
  let totalPoints = 0;

  // Visual archetype (weight 2)
  totalPoints += 2;
  if (targetFp.visualArchetype.toLowerCase() === candidateFp.visualArchetype.toLowerCase()) {
    matches += 2;
  }

  // Typography style (weight 2)
  totalPoints += 2;
  if (targetFp.typographyStyle.toLowerCase() === candidateFp.typographyStyle.toLowerCase()) {
    matches += 2;
  }

  // Color direction / Primary color key (weight 2)
  totalPoints += 2;
  if (targetFp.colorDirection.toLowerCase() === candidateFp.colorDirection.toLowerCase()) {
    matches += 2;
  }

  // Card style (weight 2)
  totalPoints += 2;
  if (targetFp.cardStyle.toLowerCase() === candidateFp.cardStyle.toLowerCase()) {
    matches += 2;
  }

  // Animation style (weight 1)
  totalPoints += 1;
  if (targetFp.animationStyle.toLowerCase() === candidateFp.animationStyle.toLowerCase()) {
    matches += 1;
  }

  // Layout type (weight 1)
  totalPoints += 1;
  if (targetFp.layoutType.toLowerCase() === candidateFp.layoutType.toLowerCase()) {
    matches += 1;
  }

  return totalPoints > 0 ? matches / totalPoints : 0;
}

/**
 * Calculates Component Pattern Similarity (card layout, hero CTA, 3D spatial, background treatment).
 */
export function calculateComponentPatternSimilarity(
  targetFp: DetailedDesignFingerprint,
  candidateFp: DesignFingerprint & Partial<DetailedDesignFingerprint>
): number {
  let score = 0;

  // Card style exact match
  if (targetFp.cardStyle.toLowerCase() === (candidateFp.cardStyle || "").toLowerCase()) {
    score += 0.4;
  }

  // Hero layout match
  if (targetFp.heroType.toLowerCase() === (candidateFp.heroType || "").toLowerCase()) {
    score += 0.3;
  }

  // Features layout match
  if (targetFp.featuresLayoutVariant && (candidateFp as any).featuresLayoutVariant) {
    if (targetFp.featuresLayoutVariant === (candidateFp as any).featuresLayoutVariant) {
      score += 0.2;
    }
  }

  // Background / spatial similarity
  if (targetFp.backgroundType && candidateFp.backgroundType) {
    if (targetFp.backgroundType === candidateFp.backgroundType) score += 0.15;
  } else {
    score += 0.1;
  }

  if (targetFp.has3dSpatial !== undefined && candidateFp.has3dSpatial !== undefined) {
    if (targetFp.has3dSpatial === candidateFp.has3dSpatial) score += 0.15;
  } else {
    score += 0.1;
  }

  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Calculates Semantic Similarity between categories and business intents.
 * High category similarity is NORMAL in same industry and must not penalize legitimate domain overlap.
 */
export function calculateSemanticSimilarity(
  categoryA: string,
  categoryB: string,
  descA: string,
  descB: string
): number {
  const catA = categoryA.toLowerCase().trim();
  const catB = categoryB.toLowerCase().trim();

  let catScore = 0;
  if (catA === catB) catScore = 1.0;
  else if (catA.includes(catB) || catB.includes(catA)) catScore = 0.7;

  const wordsA = descA.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const wordsB = descB.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const descScore = calculateJaccardSimilarity(wordsA, wordsB);

  return catScore * 0.7 + descScore * 0.3;
}

/**
 * Layer 2: Visual Comparison Interface & Abstraction
 * Supports future multimodal vision / screenshot embedding models.
 */
export interface VisualComparisonInput {
  targetImageUri?: string;
  candidateImageUri?: string;
  targetColors?: string[];
  candidateColors?: string[];
}

export interface VisualComparisonResult {
  visualSimilarity: number;
  dominantColorMatch: boolean;
  layoutDensityMatch: boolean;
  details?: string;
}

export interface VisualSimilarityComparator {
  compare(input: VisualComparisonInput): Promise<VisualComparisonResult>;
}

export class DefaultColorVisualComparator implements VisualSimilarityComparator {
  async compare(input: VisualComparisonInput): Promise<VisualComparisonResult> {
    const tColors = input.targetColors || [];
    const cColors = input.candidateColors || [];
    const colorSim = calculateJaccardSimilarity(tColors, cColors);
    return {
      visualSimilarity: colorSim,
      dominantColorMatch: colorSim > 0.5,
      layoutDensityMatch: false,
      details: `Color jaccard overlap: ${(colorSim * 100).toFixed(1)}%`,
    };
  }
}

/**
 * Calculates Image Overlap Similarity between two websites [0.0, 1.0].
 * Identical images across websites in the same or different runs directly damage visual uniqueness.
 */
export function calculateImageSimilarity(imagesA: string[] = [], imagesB: string[] = []): number {
  if (!imagesA || !imagesB || imagesA.length === 0 || imagesB.length === 0) return 0.0;
  return calculateJaccardSimilarity(imagesA, imagesB);
}

/**
 * Aggregates similarity metrics across all candidate websites using configured weights.
 * Returns the highest similarity collision candidate and the composite score strictly in [0.0, 1.0].
 */
export function evaluateCandidateSimilarities(
  newWebsite: Record<string, unknown>,
  category: string,
  description: string,
  candidates: CandidateWebsite[],
  config: UniquenessThresholdConfig = DEFAULT_UNIQUENESS_CONFIG
): {
  highestScore: number;
  closestCandidate: CandidateWebsite | null;
  bestBreakdown: SimilarityBreakdown;
  status: UniquenessStatus;
  detectedIssues: string[];
} {
  if (candidates.length === 0) {
    return {
      highestScore: 0,
      closestCandidate: null,
      bestBreakdown: {
        structuralSimilarity: 0,
        fingerprintSimilarity: 0,
        componentPatternSimilarity: 0,
        semanticSimilarity: 0,
        imageSimilarity: 0,
        compositeScore: 0,
      },
      status: "PASS",
      detectedIssues: [],
    };
  }

  const targetFp = extractDetailedDesignFingerprint(newWebsite);
  const weights = config.weights;

  let highestScore = -1;
  let closestCandidate: CandidateWebsite | null = null;
  let bestBreakdown: SimilarityBreakdown = {
    structuralSimilarity: 0,
    fingerprintSimilarity: 0,
    componentPatternSimilarity: 0,
    semanticSimilarity: 0,
    imageSimilarity: 0,
    compositeScore: 0,
  };
  const detectedIssues: string[] = [];

  for (const candidate of candidates) {
    const structuralSim = calculateStructuralSimilarity(targetFp, candidate.fingerprint);
    const fingerprintSim = calculateFingerprintSimilarity(targetFp, candidate.fingerprint);
    const componentSim = calculateComponentPatternSimilarity(targetFp, candidate.fingerprint);
    const semanticSim = calculateSemanticSimilarity(category, candidate.category, description, candidate.businessName);

    // Image overlap calculation
    const targetImages = targetFp.images || [];
    const candidateImages = candidate.images || (candidate.fingerprint as any)?.images || [];
    const imageSim = calculateImageSimilarity(targetImages, candidateImages);

    // Penalize image repetition heavily
    let imagePenalty = 0;
    if (imageSim > 0.4) {
      imagePenalty = imageSim * 0.25;
    } else if (targetImages.length > 0 && candidateImages.length > 0 && targetImages[0] === candidateImages[0]) {
      imagePenalty = 0.20;
    }

    // Penalize palette repetition
    let palettePenalty = 0;
    if (
      targetFp.paletteFingerprint &&
      (candidate.fingerprint as any)?.paletteFingerprint &&
      targetFp.paletteFingerprint === (candidate.fingerprint as any).paletteFingerprint
    ) {
      palettePenalty = 0.15;
    }

    // Composite weighted score
    const baseScore =
      structuralSim * weights.structural +
      fingerprintSim * weights.fingerprint +
      componentSim * weights.componentPattern +
      semanticSim * weights.semantic;

    const compositeScore = Math.min(1.0, Math.max(0.0, baseScore + imagePenalty + palettePenalty));

    if (compositeScore > highestScore) {
      highestScore = compositeScore;
      closestCandidate = candidate;
      bestBreakdown = {
        structuralSimilarity: Number(structuralSim.toFixed(3)),
        fingerprintSimilarity: Number(fingerprintSim.toFixed(3)),
        componentPatternSimilarity: Number(componentSim.toFixed(3)),
        semanticSimilarity: Number(semanticSim.toFixed(3)),
        imageSimilarity: Number(imageSim.toFixed(3)),
        compositeScore: Number(compositeScore.toFixed(3)),
      };
    }
  }

  // Determine specific collision issues if score exceeds passThreshold or if image duplication occurred
  if (closestCandidate) {
    const cFp = closestCandidate.fingerprint;
    const cImages = closestCandidate.images || (cFp as any)?.images || [];
    const heroImageMatch = targetFp.images.length > 0 && cImages.length > 0 && targetFp.images[0] === cImages[0];
    const imageOverlap = calculateImageSimilarity(targetFp.images, cImages);

    if (imageOverlap > 0.3 || heroImageMatch) {
      detectedIssues.push(
        `Imagery heavily duplicated from "${closestCandidate.businessName}" (${(imageOverlap * 100).toFixed(0)}% image overlap)`
      );
    }

    if (highestScore >= config.passThreshold) {
      if (targetFp.heroType === cFp.heroType) {
        detectedIssues.push(`Hero composition matches previous project "${closestCandidate.businessName}" (${targetFp.heroType})`);
      }
      if (bestBreakdown.structuralSimilarity > 0.75) {
        detectedIssues.push(`Section sequencing is heavily duplicated from "${closestCandidate.businessName}"`);
      }
      if (targetFp.cardStyle === cFp.cardStyle) {
        detectedIssues.push(`Card presentation pattern matches "${closestCandidate.businessName}" (${targetFp.cardStyle})`);
      }
      if (targetFp.backgroundType && (cFp as any).backgroundType && targetFp.backgroundType === (cFp as any).backgroundType) {
        detectedIssues.push(`Background surface treatment matches "${closestCandidate.businessName}" (${targetFp.backgroundType})`);
      }
      if (targetFp.typographyStyle === cFp.typographyStyle) {
        detectedIssues.push(`Typography pairing direction is repetitive (${targetFp.typographyStyle})`);
      }
      if (
        targetFp.paletteFingerprint &&
        (cFp as any).paletteFingerprint &&
        targetFp.paletteFingerprint === (cFp as any).paletteFingerprint
      ) {
        detectedIssues.push(`Palette collision detected with "${closestCandidate.businessName}" (${targetFp.paletteFingerprint}) - rotate colorSystem`);
      }
      if (
        targetFp.sectionVisualFingerprint &&
        (cFp as any).sectionVisualFingerprint &&
        targetFp.sectionVisualFingerprint === (cFp as any).sectionVisualFingerprint
      ) {
        detectedIssues.push(`Overall section visual layout collision detected with "${closestCandidate.businessName}"`);
      }
      if (
        targetFp.featuresLayoutVariant &&
        (cFp as any).featuresLayoutVariant &&
        targetFp.featuresLayoutVariant === (cFp as any).featuresLayoutVariant
      ) {
        detectedIssues.push(
          `Features section composition collision detected (${targetFp.featuresLayoutVariant}) - rotate featuresLayoutStrategy`
        );
      }
    }
  }

  // Derive status from thresholds
  let status: UniquenessStatus = "PASS";
  if (highestScore >= config.regenerateThreshold) {
    status = "REGENERATE";
  } else if (highestScore >= config.passThreshold) {
    status = "REVIEW";
  }

  return {
    highestScore,
    closestCandidate,
    bestBreakdown,
    status,
    detectedIssues,
  };
}
