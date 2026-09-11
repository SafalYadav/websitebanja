---
name: websitebanja-seo
description: Semantic HTML hierarchy, JSON-LD structured data, metadata hygiene, and search intent alignment.
version: 1.0.0
---

# WebsiteBanja AI — SEO & Search Architecture Intelligence Skill

> **Role**: Search Engine Discoverability, Semantic Information Architecture, Structured Data (Schema.org), and Crawlability Engineering.  
> **Source**: Google Search Essentials, Schema.org specifications, Core Web Vitals guidelines, and modern Next.js metadata architecture.  
> **Application Priority**: Semantic Crawlability & Canonical Accuracy > User Content Relevance > Schema.org Rigor > Keyword Optimization.

---

## 1. Core Philosophy: Semantic Clarity for Humans and Crawlers

Modern SEO is not about tricking algorithms with keyword stuffing. It is about creating clean, semantic, fast-loading digital architecture that search engines and AI agents (Google, Bing, ChatGPT, Perplexity, Claude) can parse, comprehend, and cite with absolute precision.

### The 4 Pillars of Search Architecture
1. **Server-Rendered Semantic Grounding**: Critical business information, value propositions, and services must exist in clean HTML text in the initial DOM response, not hidden behind client-only runtime execution.
2. **Deterministic Metadata**: Unique, punchy title tags (50–60 characters) and high-intent meta descriptions (140–160 characters) with clear calls-to-action.
3. **Structured Data Knowledge Graph (JSON-LD)**: Machine-readable Schema.org entities (`Organization`, `LocalBusiness`, `SoftwareApplication`, `Product`, `FAQPage`) that clarify relationships.
4. **Natural Topical Authority**: Dense, informative, authentic industry terminology instead of repetitive keyword spam.

---

## 2. On-Page Semantic SEO Rules

### A. Title Tag & Meta Description Standards
- **Title Tag Formula**: `[Primary Benefit / Core Service] | [Business Name]` (or for local: `[Service] in [City, State] | [Business Name]`).
  - *Length*: 50 to 60 characters maximum.
  - *Example*: `Emergency 24/7 Plumber in Seattle, WA | Rapid Plumbing`
- **Meta Description Formula**: Start with an active verb, detail the core offering, highlight a unique proof point, and conclude with a call-to-action.
  - *Length*: 140 to 160 characters.
  - *Example*: `Licensed 24/7 plumbers serving Seattle and King County. Fast 45-minute response time, upfront flat-rate pricing. Call (555) 019-2834 for immediate emergency service.`

### B. Heading Tag Architecture
- **H1 (1 per page)**: Primary keyword-aligned value proposition (e.g. `<h1>Intelligent Cloud Cost Optimization for Enterprise Teams</h1>`).
- **H2 (Section Anchors)**: Group distinct thematic capabilities (e.g. `<h2>Automated Kubernetes Rightsizing</h2>`, `<h2>Real-Time Anomaly Detection</h2>`).
- **H3 (Card / Item Titles)**: Specific features, service details, or testimonial author roles.

### C. Internal Linking & Anchor Text
- Link between related capabilities using descriptive contextual anchor text (e.g., `Check out our <a href="/pricing">transparent SaaS pricing plans</a>`).
- Never use generic anchor text like `click here`, `read more`, or `link`.

---

## 3. Structured Data (Schema.org JSON-LD) Recipes

Every generated website must declare its structured identity:

### A. Local Business Schema (Restaurants, Trades, Clinics)
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://example.com/#business",
  "name": "Rapid Plumbing",
  "image": "https://example.com/logo.png",
  "telephone": "+1-555-019-2834",
  "email": "service@rapidplumbing.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "100 Market St",
    "addressLocality": "Seattle",
    "addressRegion": "WA",
    "postalCode": "98101",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 47.6062,
    "longitude": -122.3321
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "00:00",
      "closes": "23:59"
    }
  ],
  "priceRange": "$$"
}
```

### B. FAQPage Schema
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How quickly can an emergency technician arrive?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our licensed technicians arrive within 45 to 60 minutes anywhere in the greater metropolitan area."
      }
    }
  ]
}
```

---

## 4. Local SEO Discipline (NAP Consistency)

For local brick-and-mortar or home-service businesses:
- **NAP Consistency**: Name, Address, and Phone Number must be 100% identical in the footer, contact section, header, and Schema.org metadata.
- **Click-to-Call Link**: Phone numbers must use `<a href="tel:+15550192834">` for instant mobile calling.
- **Service Area Delineation**: Explicitly name cities, neighborhoods, and regions served so local geo-queries rank accurately.

---

## 5. Critical SEO Anti-Patterns

1. **Keyword Stuffing**: Repetitively jamming the same keyword 20 times into a paragraph ("If you need plumber Seattle, our Seattle plumber is the best plumber in Seattle").
2. **Missing or Duplicate H1s**: Having zero `<h1>` tags or having 5 competing `<h1>` tags scattered across cards.
3. **Thin Content / Empty Pages**: Generating pages with only 50 words of placeholder text. Search engines flag thin pages as low quality.
4. **Text in JPEGs**: Baking opening hours or pricing into a banner image where web crawlers cannot extract it.
5. **Broken Canonical URLs**: Missing or conflicting `rel="canonical"` tags that confuse crawlers about which domain is authoritative.

---

## 6. Pre-Ship SEO Quality Checklist

- [ ] Does the page have a unique, benefit-driven `<title>` between 50 and 60 characters?
- [ ] Is the meta description informative, active, and between 140 and 160 characters?
- [ ] Is there exactly one semantic `<h1>` tag followed by logical `<h2>` and `<h3>` tags?
- [ ] Are all informative images accompanied by descriptive, contextual `alt` attributes?
- [ ] Is Schema.org JSON-LD metadata embedded for the organization or local business?
- [ ] Is NAP (Name, Address, Phone) clearly present and click-to-call enabled?
