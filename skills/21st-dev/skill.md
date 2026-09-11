---
name: websitebanja-21st-dev
description: Modern component architecture, tactile surfaces, atmospheric depth, subtle specular borders, and high-converting bento layouts.
version: 1.0.0
---

# WebsiteBanja AI — 21st.dev Component Design Intelligence Skill

> **Role**: Authoritative Modern Component Architecture, Atmospheric Surface Engineering, and High-Craft UI Patterns for WebsiteBanja AI.  
> **Source**: Extracted and synthesized from modern production design systems, the 21st.dev component ecosystem, ambient lighting patterns, and tactile interaction models.  
> **Application Priority**: User Explicit Requirements > Usability & Contrast Integrity > Component Hierarchy & Craft > Visual Surface Polish.

---

## 1. Core Philosophy of 21st-Century Component Design

Modern components are not merely generic rectangular `<div>` containers. High-craft web design treats every component as an **engineered interactive surface**.

### The 6 Core Tenets
1. **Atmospheric Depth over Flatness**: Surfaces possess subtle depth created by multi-layered borders, directional lighting, and ambient backdrops rather than harsh drop shadows.
2. **Tactile Micro-Affordances**: Elements provide immediate, subtle feedback upon interaction (subtle border illumination, 1–2px micro-lifts, directional arrow nudges).
3. **Information Density with Breathing Room**: High data utility without claustrophobic clutter. Generous internal padding (24px–32px on cards) paired with scannable typographic hierarchy.
4. **Token-Aware & Theme-Native**: Components never hardcode arbitrary hex colors; they strictly consume semantic CSS variables (`--wb-bg`, `--wb-fg`, `--wb-primary`, `--wb-muted`).
5. **Content-Aware Geometry**: The container shape reinforces its content. Short metrics live in compact tiles; narrative features live in wide asymmetric bento rows.
6. **Purposeful Uniqueness**: Components feel bespoke to the client's industry rather than looking like an uncustomized CSS library.

---

## 2. Atmospheric Surface Treatments & Lighting

Modern premium websites achieve their "expensive" look through precise lighting and border physics.

### A. Layered Borders & Edge Highlights
To make a dark or light card look tactile, combine an outer boundary with an inner specular highlight:
```css
/* Dark Mode Tactile Border */
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.12),
            0 4px 20px -2px rgba(0, 0, 0, 0.35);

/* Light Mode Tactile Border */
border: 1px solid rgba(0, 0, 0, 0.06);
box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.8),
            0 4px 16px -2px rgba(0, 0, 0, 0.05);
```

### B. Ambient Radial Glow & Spotlights
Position soft radial gradients behind focal elements to draw the eye without obstructing content:
```tsx
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/15 blur-[120px] rounded-full pointer-events-none -z-10" />
```
- **Spotlight Hover Tracking**: In bento cards, calculate mouse coordinates on `pointermove` and position a local radial highlight (`radial-gradient(400px circle at ${x}px ${y}px, rgba(255,255,255,0.06), transparent 80%)`) to create a flashlight effect.

### C. Contrast-Preserving Glassmorphism
- Never use raw translucent glass over busy backgrounds. Always enforce high background opacity (`bg-background/85` or `bg-slate-900/80`) paired with `backdrop-blur-md` to maintain WCAG AA text contrast (`4.5:1` minimum).

### D. Gradient Text Clipping
- Reserve `bg-clip-text text-transparent bg-gradient-to-r` for **key 2–4 word phrases** within major headlines. Never apply gradient text to full paragraphs or auxiliary labels.

---

## 3. The Bento Grid Architecture

The Bento Grid (inspired by Japanese bento boxes) organizes varied features into an asymmetric, modular mosaic.

```
┌──────────────────────────────────────┬───────────────────┐
│ Card 1: Primary Feature Anchor       │ Card 2: Metric    │
│ (2 Columns / Wide Aspect)            │ (1 Column)        │
│ Headline + Preview Graphic           │ Stat + Sparkline  │
├───────────────────┬──────────────────┴───────────────────┤
│ Card 3: Workflow  │ Card 4: Interactive Micro-State       │
│ (1 Column)        │ (2 Columns / Wide Aspect)            │
│ Step-by-step list │ Live interactive toggle / code demo  │
└───────────────────┴──────────────────────────────────────┘
```

### Bento Grid Rules
1. **Asymmetric Spanning**: Use CSS Grid with `col-span-1` and `col-span-2` (on desktop 3-column grids) to create visual rhythm.
2. **Anchor Card**: Exactly one card must serve as the visual anchor (largest dimensions, strongest contrast, or richest illustration).
3. **Internal Card Anatomy**:
   - **Eyebrow**: Category or capability pill (`text-xs font-semibold text-primary uppercase tracking-wider`).
   - **Headline**: Benefit-driven title (18px–22px).
   - **Description**: 1–2 sentences explaining real-world utility.
   - **Visual Artifact**: Live interactive UI snippet, mini chart, mock toggle, or workflow graphic.
4. **Responsive Stacking**: On mobile (`< 768px`), collapse all spans to `col-span-1` and stack vertically.

---

## 4. Modern Hero Section Archetypes

WebsiteBanja AI selects hero structures based on vertical, brand personality, and conversion goals:

### Archetype 1: The Ambient Glow SaaS Hero
- **Best For**: B2B SaaS, developer platforms, AI productivity tools, fintech.
- **Anatomy**:
  - Centered layout with subtle ambient backlight.
  - Floating pill badge at top (`"Introducing v2.0 ->"`).
  - High-impact headline with gradient accent on the value proposition.
  - Subtitle capped at 2 concise sentences.
  - Dual CTA group: Primary high-contrast button + secondary ghost/outline button.
  - Centered high-fidelity application preview with soft perspective tilt (`rotateX(4deg)`) and ambient glow.
  - Social proof logos row directly below.

### Archetype 2: The Clean Minimalist Editorial Hero
- **Best For**: Luxury hospitality, boutique legal, architecture, high-end creative studios.
- **Anatomy**:
  - High-whitespace, asymmetrical 2-column layout (60% copy / 40% imagery).
  - Large serif display heading with elegant optical kerning.
  - Single understated primary CTA (e.g. `"Reserve Your Suite"`, `"View Portfolio"`).
  - Editorial photography with asymmetric bleed and subtle border framing.
  - Zero fluorescent glows or neon gradients; restrained neutral tones.

### Archetype 3: The Interactive Simulation Hero
- **Best For**: E-commerce calculators, quote generators, financial planners.
- **Anatomy**:
  - Left column: Value proposition and trust credentials.
  - Right column: Interactive preview widget (e.g., live price estimator, interactive ROI slider, instant domain lookup).
  - Immediate tangible value before asking for user registration.

### Archetype 4: The High-Trust Local Service Hero
- **Best For**: Dental clinics, legal practices, plumbing/HVAC, local contractors.
- **Anatomy**:
  - Direct benefit headline (`"Licensed 24/7 Emergency Plumber in Seattle"`).
  - Immediate phone click-to-call button with active status indicator (`"Available Now — (555) 019-2834"`).
  - Google / Yelp verified review badge (`"4.9 Stars • 450+ Verified Reviews"`).
  - Short booking card or zip code availability checker.

---

## 5. High-Conversion Pricing Tables

Pricing tables are the highest-stakes conversion surfaces on commercial websites.

### Anatomy of Modern Pricing Tiers
1. **Billing Switch**: Toggle between Monthly and Annual billing with a high-contrast pill badge (`"Save 20%"`).
2. **Three-Tier Architecture**:
   - **Starter / Free**: Baseline features for individuals.
   - **Pro / Growth (The Highlighted Tier)**:
     - Visually elevated with subtle scale (`scale-105` on desktop) or gradient border highlight.
     - Sticky ribbon badge: `"Most Popular"` or `"Recommended"`.
     - Solid high-contrast CTA button.
   - **Enterprise / Custom**: Customized limits, dedicated support, outline CTA (`"Contact Sales"`).
3. **Feature Checklist Discipline**:
   - Use Lucide SVG icons (`<Check className="text-primary w-4 h-4" />`), NEVER raw bullet points.
   - Clearly delineate included vs excluded features with subtle opacity differences (`text-muted-foreground line-through` for excluded).
4. **Transparent Reassurance**:
   - Clarify trial terms right below the CTA: `"14-day free trial • No credit card required • Cancel anytime"`.

---

## 6. Social Proof, Testimonials & Logo Marquees

1. **The Infinite Logo Marquee**:
   - Continuous horizontal scroll displaying customer/partner logos.
   - Render logos in unified muted grayscale (`opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all`).
   - Pause animation on hover or focus for accessibility.
2. **Verified Testimonial Cards**:
   - Authentic customer quote (2–3 sentences max).
   - Star rating badge (5 gold SVG stars).
   - Reviewer photo/avatar, full name, job title, and verified company logo.
   - Measurable metric callout (e.g., `"+140% pipeline growth in 60 days"`).

---

## 7. High-Impact Call-to-Action (CTA) Banners

The final pre-footer CTA must summarize the value proposition and eliminate final friction.
- **Card Format**: Enclosed within a high-contrast container (`rounded-3xl p-8 sm:p-16`) with an ambient radial backlight.
- **Action-Oriented Headline**: `"Ready to modernize your workflow?"`
- **Dominant Button**: Single high-contrast primary CTA.
- **Trust Reassurance**: Reiterate money-back guarantee, instant setup, or direct support.

---

## 8. Modern Navigation & Header Systems

### A. Floating Pill Navigation
- Centered container with `max-w-4xl`, `rounded-full`, `px-6 py-3`, `backdrop-blur-md bg-background/80 border shadow-lg`.
- Brand logo on left, navigation links centered with hover underlines or sliding pills, primary action button on right.
- Slides out of view or compacts smoothly on scroll down; re-appears instantly on scroll up.

### B. Mobile Navigation Sheet
- Hamburger trigger with accessible `aria-label="Open Navigation Menu"`.
- Full-height drawer sliding in from the right or top with backdrop scrim.
- Staggered link reveal with large touch targets (minimum 48px height per link).
- Bottom section provides quick contact details and prominent CTA.

---

## 9. Modern Interactive Micro-Surfaces

1. **3D Tilt Cards**:
   - Card responds to mouse position using subtle CSS 3D transforms (`perspective(1000px) rotateX(...) rotateY(...)`).
   - Limit rotation to maximum **4 to 6 degrees** to maintain legibility.
2. **Metric / Stat Cards**:
   - Large bold numerical value (`text-3xl sm:text-4xl font-extrabold tracking-tight`).
   - Descriptive label (`text-sm text-muted-foreground`).
   - Contextual delta badge (`"+24% this quarter"` with green trend arrow).
3. **Expandable Specification Cards**:
   - Compact summary view with a `"View Details"` trigger that smoothly expands without navigating away.

---

## 10. Forms, Inputs & Command Palettes

1. **Tactile Input Fields**:
   - Subtly tinted background (`bg-muted/40`), clear placeholder text, and high-visibility focus ring (`focus:ring-2 focus:ring-primary focus:border-transparent`).
   - Dedicated validation feedback icons (Lucide `<CheckCircle2>` for valid, `<AlertCircle>` for invalid).
2. **Command Palette (Cmd+K) Pattern**:
   - Modal search dialog accessible via keyboard shortcut (`Cmd+K` / `Ctrl+K`).
   - Categorized search results (Actions, Pages, Documentation, Settings) with keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`).

---

## 11. Accessibility, Tokens & Theming

- **Semantic Variables**: Every component must map styles to design tokens:
  - Backgrounds: `var(--wb-bg)`, `var(--wb-surface)`
  - Text: `var(--wb-fg)`, `var(--wb-muted-fg)`
  - Brand: `var(--wb-primary)`, `var(--wb-primary-fg)`
  - Borders: `var(--wb-border)`
- **Visible Focus Outlines**: Never remove `outline: none` without providing an explicit replacement `ring-2 ring-primary ring-offset-2`.
- **Screen Reader Support**: Use semantic tags (`<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`) and appropriate ARIA roles (`role="dialog"`, `aria-expanded`, `aria-controls`).

---

## 12. Component Anti-Patterns

1. **The Blinding Glow**: Over-saturating radial gradients until headline text becomes impossible to read.
2. **The Mystery Meat Card**: Creating cards with ambiguous iconography and zero explanatory text.
3. **The Fake Click Target**: Styling an entire card with hover elevation and cursor pointer when only a small internal link is actually clickable.
4. **The Crowded Bento**: Cramming 10 tiny cards into a bento grid, destroying whitespace and confusing visual hierarchy.
5. **The Unusable Mobile Table**: Placing a 6-column pricing table on mobile without responsive card restructuring or clean horizontal scrolling.

---

## 13. Pre-Ship Component Verification Checklist

Before shipping any modern component:
- [ ] **Surface Depth**: Does the card have a clean border highlight and subtle ambient depth?
- [ ] **Contrast Verification**: Does all text achieve WCAG AA contrast (`4.5:1` normal text, `3:1` large text)?
- [ ] **Touch Target Size**: Are all interactive buttons, links, and switches at least `44×44px`?
- [ ] **Hover Continuity**: Do hover states reverse smoothly on pointer leave?
- [ ] **Responsive Reflow**: Does the component stack cleanly at `375px`, `768px`, and `1024px`?
- [ ] **Semantic Token Binding**: Are all colors and borders derived from CSS tokens rather than hardcoded hex values?
- [ ] **Screen Reader Attributes**: Are modals, accordions, and dropdowns properly labeled with ARIA attributes?
