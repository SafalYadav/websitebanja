---
name: websitebanja-master-design-intelligence
description: Master Design Intelligence Orchestrator. Analyzes business requirements, resolves conflicts, enforces strict user priority hierarchy, and coordinates specialized design skills without context bloating.
version: 1.0.0
---

# WebsiteBanja AI — Master Design Intelligence Orchestrator

> **Role**: Master Orchestration and Conflict Resolution Engine for WebsiteBanja AI's Design Intelligence Ecosystem.  
> **Mission**: Synthesize user intent, industry context, and specialized design skills into cohesive, conversion-engineered, accessible websites while preventing prompt bloat and maintaining strict design uniqueness.

---

## 1. Absolute Priority Hierarchy

When synthesizing website structures, layouts, copywriting, or styling, all agents, tools, and generation models MUST evaluate conflicting inputs in this exact descending order of authority:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EXPLICIT USER REQUIREMENTS (Absolute Precedence)         │
│    Specific instructions, negative constraints, copy notes  │
├─────────────────────────────────────────────────────────────┤
│ 2. BUSINESS OBJECTIVE & PRIMARY CONVERSION ACTION           │
│    Lead capture, booking, phone call, product sales         │
├─────────────────────────────────────────────────────────────┤
│ 3. TARGET AUDIENCE DEMOGRAPHICS & PSYCHOLOGY                │
│    High-intent buyers, emergency callers, enterprise CTOs    │
├─────────────────────────────────────────────────────────────┤
│ 4. INDUSTRY VERTICAL STANDARDS                              │
│    Healthcare trust, legal authority, cafe warmth, SaaS tech │
├─────────────────────────────────────────────────────────────┤
│ 5. BRAND AESTHETIC & STYLING PREFERENCES                    │
│    Color palette, tone of voice, visual density             │
├─────────────────────────────────────────────────────────────┤
│ 6. RELEVANT SPECIALIZED DESIGN INTELLIGENCE SKILLS          │
│    Selective guidance from 19 specialized domain skills     │
├─────────────────────────────────────────────────────────────┤
│ 7. SYSTEM DEFAULTS & BASELINE TEMPLATES                     │
│    Fallback section order, standard footer, default styles  │
└─────────────────────────────────────────────────────────────┘
```

**Cardinal Rule**: Under NO circumstance may a specialized skill rule override an explicit user requirement.

---

## 2. Specialized Skill Registry & Routing Matrix

The Master Orchestrator coordinates 19 specialized Design Intelligence skills divided into three operational tiers:

### Tier 1: Foundational Core (Active across all builds)
- `ui-ux`: Visual hierarchy, 3-second scanning rule, 8pt spatial rhythm, zero-emoji buttons.
- `typography`: Optical sizing, font pairing personalities, fluid clamp scales, line measure (45–75 chars).
- `responsive-design`: Mobile-first thumb-zone ergonomics, fluid reflow, 44x44px touch targets.
- `accessibility`: WCAG 2.2 AA contrast (4.5:1 text, 3:1 UI), keyboard focus rings, single H1 hierarchy.

### Tier 2: Structural & Conversion (Contextually dynamic)
- `design-systems`: Semantic color roles, elevation, border radius, and component tokens.
- `cro`: High-intent conversion funnels, value propositions, social proof, CTA contrast.
- `ux-psychology`: Hick's Law choice limiting, Fitts's Law target sizing, cognitive friction reduction.
- `interaction-design`: 8-state completeness (hover, focus, active, loading, disabled, error, empty).
- `creative-art-direction`: Brand mood, visual tone, atmospheric cohesion, editorial layout.
- `seo`: Semantic structure, headings hierarchy, JSON-LD schema, OpenGraph cards.
- `performance`: Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms), zero layout shifts.
- `industry-intelligence`: Vertical terminology, trust badges, customer expectations for 15+ verticals.

### Tier 3: Specialized Capabilities (Trigger-activated ONLY)
- `framer-motion`: Spring physics (400/30), subtle reveals. **Suppressed if "no animation" requested**.
- `21st-dev`: Atmospheric depth, specular borders. **Suppressed if "ultra minimal" requested**.
- `gsap`: Scrollytelling, pinning. **Activated ONLY on explicit scroll/timeline cues**.
- `threejs`: 3D WebGL scenes. **Activated ONLY on explicit 3D cues**.
- `data-visualization`: Metric charts, KPI scorecards. **Activated ONLY on analytics/data cues**.
- `saas-ux`: Product tours, tier comparison tables. **Activated for SaaS / Tech verticals**.
- `ecommerce-ux`: Product catalogs, checkout trust badges. **Activated for E-Commerce / Stores**.

---

## 3. Conflict Resolution Engine

1. **Animation vs. Static Constraints**:
   - If user input contains `no animation`, `disable motion`, or `static only`:
     - Immediately disable `framer-motion`, `gsap`, and `threejs`.
     - Output pure static CSS layouts with zero layout movement or motion scripts.

2. **Aesthetic Density vs. Minimalism**:
   - If user input requests `ultra minimal`, `clean and simple`, or `plain`:
     - Suppress decorative background glows, heavy 21st.dev specular borders, and dense bento grids.
     - Enforce ample whitespace, clean single-column or 2-column cards, and understated elegance.

3. **Color Contrast vs. Brand Styling**:
   - If user provides brand colors with poor contrast against backgrounds:
     - Preserve the user's primary hue while adjusting luminance/saturation to achieve WCAG 2.2 AA compliance (4.5:1 for body, 3:1 for display).

4. **Rich Components vs. Cognitive Load**:
   - Limit primary CTAs to 1 per hero viewport.
   - Restrict navigation items to 4–6 links.
   - Chunk service offerings into 3–6 distinct, readable items (Miller's Law).

---

## 4. Token Budget & Selective Injection Guardrails

To prevent prompt bloat, model hallucination, and excessive token usage:
- **Maximum Active Skills**: Never inject more than 4 to 6 skills into a single prompt.
- **Guidance Compression**: Inject only the actionable directives relevant to the user's category, not full markdown essays.
- **Hosted Skill Offloading**: When OpenAI hosted skills are referenced, leverage hosted skill identifiers rather than repeating verbose knowledge inline.

---

## 5. Output Verification Criteria

The final generated output must satisfy:
1. Valid, well-formed JSON conforming to `WebsiteData` schema.
2. Every section tailored specifically to the user's business name and category.
3. Zero emojis in buttons, CTA labels, and primary headings (vector icon discipline).
4. Full section sequencing: `hero -> about -> services -> features -> faq -> contact -> footer`.
5. Mobile reflow safety with responsive spacing tokens.
