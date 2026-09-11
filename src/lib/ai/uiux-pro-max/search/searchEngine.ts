// src/lib/ai/uiux-pro-max/search/searchEngine.ts

import { BM25 } from "./bm25";
import type {
  ProductCatalogEntry,
  UiStyleEntry,
  ColorPaletteEntry,
  TypographyPairingEntry,
  LandingPatternEntry,
  UxGuidelineEntry,
  MotionSnippetEntry,
  StackGuidelineEntry,
} from "../types";

import productsData from "../data/products.json";
import stylesData from "../data/styles.json";
import colorsData from "../data/colors.json";
import typographyData from "../data/typography.json";
import landingData from "../data/landing.json";
import uxGuidelinesData from "../data/uxGuidelines.json";
import motionData from "../data/motion.json";
import stacksData from "../data/stacks.json";

const QUERY_REWRITES: Record<string, Record<string, string | null>> = {
  color: {
    color: null,
    palette: null,
    hex: null,
    rgb: null,
    token: null,
    semantic: null,
    destructive: null,
    muted: null,
    foreground: null,
  },
  landing: { testimonial: "testimonials" },
  style: {
    css: null,
    implementation: null,
    variable: null,
    checklist: null,
    tailwind: null,
  },
  ux: {
    ux: "accessibility",
    usability: "accessibility",
    wcag: "accessibility",
  },
  typography: { typography: "font" },
};

function rewriteQuery(query: string, domain: string): string {
  const rewrites = QUERY_REWRITES[domain];
  if (!rewrites) return query;

  const words = query.split(/\s+/);
  const rewritten = words.map((w) => {
    const lower = w.toLowerCase();
    if (lower in rewrites) {
      return rewrites[lower] ?? "";
    }
    return w;
  });

  return rewritten.filter(Boolean).join(" ");
}

interface DomainIndex<T> {
  data: T[];
  bm25: BM25;
}

function buildIndex<T>(data: T[], searchFields: Array<keyof T>): DomainIndex<T> {
  const documents = data.map((row) =>
    searchFields
      .map((field) => String(row[field] ?? ""))
      .join(" ")
  );
  const bm25 = new BM25();
  bm25.fit(documents);
  return { data, bm25 };
}

// In-memory fitted indices
const productIndex = buildIndex(productsData as ProductCatalogEntry[], [
  "Product Type",
  "Keywords",
  "Primary Style Recommendation",
  "Key Considerations",
]);

const styleIndex = buildIndex(stylesData as UiStyleEntry[], [
  "Style ID",
  "Style Category",
  "Aliases",
  "Keywords",
  "Best For",
  "Type",
  "AI Prompt Keywords",
]);

const colorIndex = buildIndex(colorsData as ColorPaletteEntry[], [
  "Product Type",
  "Notes",
]);

const typographyIndex = buildIndex(typographyData as TypographyPairingEntry[], [
  "Font Pairing Name",
  "Category",
  "Mood/Style Keywords",
  "Best For",
  "Heading Font",
  "Body Font",
]);

const landingIndex = buildIndex(landingData as LandingPatternEntry[], [
  "Pattern ID",
  "Pattern Name",
  "Aliases",
  "Keywords",
  "Conversion Optimization",
  "Section Order",
]);

const uxIndex = buildIndex(uxGuidelinesData as UxGuidelineEntry[], [
  "Category",
  "Issue",
  "Description",
  "Platform",
]);

const motionIndex = buildIndex(motionData as MotionSnippetEntry[], [
  "Category",
  "Intensity Tier",
  "Keywords",
  "Trigger",
]);

export interface SearchResult<T> {
  results: T[];
  count: number;
  query: string;
  domain: string;
}

function executeDomainSearch<T>(
  indexObj: DomainIndex<T>,
  rawQuery: string,
  domain: string,
  maxResults = 3
): SearchResult<T> {
  const query = rewriteQuery(rawQuery, domain) || rawQuery;
  const scored = indexObj.bm25.score(query);
  const topHits = scored
    .filter((s) => s.score > 0)
    .slice(0, maxResults)
    .map((s) => indexObj.data[s.index]);

  return {
    results: topHits.length > 0 ? topHits : (indexObj.data.slice(0, 1) as T[]),
    count: topHits.length,
    query,
    domain,
  };
}

export const searchEngine = {
  searchProducts(query: string, maxResults = 1): SearchResult<ProductCatalogEntry> {
    return executeDomainSearch(productIndex, query, "product", maxResults);
  },

  searchStyles(query: string, maxResults = 3): SearchResult<UiStyleEntry> {
    return executeDomainSearch(styleIndex, query, "style", maxResults);
  },

  searchColors(query: string, maxResults = 5): SearchResult<ColorPaletteEntry> {
    return executeDomainSearch(colorIndex, query, "color", maxResults);
  },

  searchTypography(query: string, maxResults = 2): SearchResult<TypographyPairingEntry> {
    return executeDomainSearch(typographyIndex, query, "typography", maxResults);
  },

  searchLanding(query: string, maxResults = 2): SearchResult<LandingPatternEntry> {
    return executeDomainSearch(landingIndex, query, "landing", maxResults);
  },

  searchUx(query: string, maxResults = 3): SearchResult<UxGuidelineEntry> {
    return executeDomainSearch(uxIndex, query, "ux", maxResults);
  },

  searchMotion(query: string, maxResults = 3): SearchResult<MotionSnippetEntry> {
    return executeDomainSearch(motionIndex, query, "gsap", maxResults);
  },

  searchStack(
    query: string,
    stackName: "nextjs" | "react" | "html-tailwind" | "shadcn" = "nextjs",
    maxResults = 3
  ): SearchResult<StackGuidelineEntry> {
    const stackItems = (stacksData as Record<string, StackGuidelineEntry[]>)[stackName] || [];
    if (stackItems.length === 0) {
      return { results: [], count: 0, query, domain: `stack:${stackName}` };
    }
    const stackIdx = buildIndex(stackItems, ["Category", "Guideline", "Description", "Do", "Don't"]);
    return executeDomainSearch(stackIdx, query, `stack:${stackName}`, maxResults);
  },
};
