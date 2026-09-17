// src/lib/agents/uniqueness/uniquenessPrompt.ts
import type { CandidateWebsite, UniquenessCheckInput } from "./types";
import { extractDetailedDesignFingerprint } from "./fingerprint";

export function buildUniquenessSystemPrompt(): string {
  return `You are WebsiteBanja AI's Uniqueness & Verification Agent.
Your responsibility is to audit newly generated websites for excessive design repetition against recent previous designs in the same category.

CRITICAL ARCHITECTURAL RULES:
1. DO NOT CLAIM 100% MATHEMATICAL UNIQUENESS.
   The goal is to prevent obvious copycat / repetitive design templates while enabling fresh, purposeful variations.
2. RECOGNIZE LEGITIMATE INDUSTRY CONVENTIONS:
   Two websites in the same industry naturally share common section types (e.g., Restaurant A and Restaurant B both legitimately need Menu, About, Location, Contact).
   This is NORMAL and expected. Do NOT penalize shared business content.
3. FOCUS STRICTLY ON DESIGN COMPOSITION & IMPLEMENTATION PATTERNS:
   Flag repetition only when IMPLEMENTATION patterns collide:
   - Identical hero layouts (e.g., same split-screen hero layout and identical CTA posture)
   - Identical card treatments (e.g., both using identical bento grids or identical flat cards)
   - Identical section sequences when alternative narrative flows exist
   - Identical typography pairings, color systems, or border radius hierarchies
   - Identical motion / spatial interaction styles
4. RESPECT EXPLICIT USER CONSTRAINTS:
   - If the user explicitly requested a specific constraint (e.g., "Must use black and white monochrome" or "Must have WhatsApp floating button"), NEVER flag that requested feature as an issue.
   - If 3D preference is NO ("no"), NEVER propose 3D, WebGL, or spatial animations in redesignDirectives. Keep all recommendations strictly within non-generic 2D design.
5. PROVIDE ACTIONABLE TARGETED REDESIGN DIRECTIVES:
   If status is REGENERATE or REVIEW, provide concrete redesign directives instructing the website generator on exactly what composition, layout, or typography choices to change.

STATUS CRITERIA:
- PASS (similarityScore < 0.65): Distinctive design composition with healthy variation.
- REVIEW (0.65 <= similarityScore < 0.82): Minor repetitive motifs that can be polished or accepted.
- REGENERATE (similarityScore >= 0.82): Blatantly duplicate layout rhythm, hero composition, card styling, or color distribution.

You must return valid JSON strictly conforming to this structure:
{
  "status": "PASS" | "REVIEW" | "REGENERATE",
  "similarityScore": 0.0 to 1.0,
  "closestCandidateId": "candidate_id_or_empty",
  "closestCandidateName": "candidate_business_name_or_empty",
  "issues": ["Specific collision reason 1", "Specific collision reason 2"],
  "redesignDirectives": ["Concrete redesign directive 1", "Concrete redesign directive 2"],
  "similarityBreakdown": {
    "structuralSimilarity": 0.0 to 1.0,
    "fingerprintSimilarity": 0.0 to 1.0,
    "componentPatternSimilarity": 0.0 to 1.0,
    "semanticSimilarity": 0.0 to 1.0,
    "compositeScore": 0.0 to 1.0
  },
  "confidence": 0.0 to 1.0,
  "summary": "Concise 1-2 sentence verification verdict"
}`;
}

export function buildUniquenessUserPrompt(
  input: UniquenessCheckInput,
  candidates: CandidateWebsite[],
  deterministicSummary?: string
): string {
  const targetFp = extractDetailedDesignFingerprint(input.newWebsite);

  const candidateSummaries = candidates.map((c, idx) => `
Candidate #${idx + 1} [ID: ${c.id}]
Business Name: ${c.businessName}
Category: ${c.category}
Hero Type: ${c.fingerprint.heroType}
Navigation Type: ${c.fingerprint.navigationType}
Layout Type: ${c.fingerprint.layoutType}
Section Sequence: [${c.sectionOrder.join(" -> ")}]
Visual Archetype: ${c.fingerprint.visualArchetype}
Typography Style: ${c.fingerprint.typographyStyle}
Color Direction: ${c.fingerprint.colorDirection}
Card Style: ${c.fingerprint.cardStyle}
Animation Style: ${c.fingerprint.animationStyle}
`).join("\n---\n");

  return `NEWLY GENERATED WEBSITE TO VERIFY:
Business Name: ${input.businessName}
Category: ${input.category}
Description: ${input.description}
3D Preference: ${input.threeDPreference === "yes" ? "YES (3D allowed)" : "NO (Hard constraint: strictly 2D only)"}
Explicit User Constraints: ${input.explicitConstraints && input.explicitConstraints.length > 0 ? input.explicitConstraints.join("; ") : "None specified"}
Regeneration Attempt: ${input.regenerationAttempt || 0}

NEW WEBSITE DESIGN FINGERPRINT:
- Hero Type: ${targetFp.heroType}
- Navigation Type: ${targetFp.navigationType}
- Layout Type: ${targetFp.layoutType}
- Section Sequence: [${targetFp.sectionOrder.join(" -> ")}]
- Visual Archetype: ${targetFp.visualArchetype}
- Typography Style: ${targetFp.typographyStyle}
- Color Direction: ${targetFp.colorDirection}
- Card Style: ${targetFp.cardStyle}
- Animation Style: ${targetFp.animationStyle}
- 3D Spatial: ${targetFp.has3dSpatial ? "Enabled" : "Disabled"}
- Total Sections: ${targetFp.totalSections}

DETERMINISTIC PRE-EVALUATION:
${deterministicSummary || "No deterministic collision detected."}

RECENT CANDIDATE WEBSITES IN SAME / SIMILAR CATEGORY:
${candidateSummaries || "No previous candidate websites found in database."}

Evaluate the design composition and return the JSON verification verdict.`;
}
