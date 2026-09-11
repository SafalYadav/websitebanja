---
name: websitebanja-design-systems
description: Design token architecture, 8pt mathematical rhythm, semantic color roles, border radius, and elevation tokens.
version: 1.0.0
---

# WebsiteBanja AI — Design Systems Intelligence Skill

> **Role**: Design Token Architecture, Systematic Cohesion, Scalable Layout Geometry, and Visual Variable Orchestration.  
> **Source**: Modern multi-brand token specifications (W3C Design Tokens Community Group), scalable component libraries (Radix, Tailwind, Shadcn), and atomic design systems.  
> **Application Priority**: User Explicit Requirements > Theme & Brand Cohesion > Spatial Math & Contrast > Platform Defaults.

---

## 1. Core Philosophy: Systemic Geometry & Fluid Adaptability

A design system is not a rigid visual cage. It is a mathematical language that ensures every generated screen looks intentional, coherent, and engineered rather than assembled from haphazard CSS snippets.

### The 5 Systemic Axioms
1. **Mathematical Spatial Rhythm**: Every padding, margin, gap, and dimension derives from a predictable base spatial multiplier (strictly **8pt grid**, with **4pt half-steps** for micro-elements).
2. **Semantic Token Abstraction**: Never hardcode arbitrary hex color values, absolute pixel typography, or magic layout numbers in generated markup. Every element references semantic design tokens (`--wb-bg`, `--wb-fg`, `--wb-primary`, `--wb-surface`, `--wb-border`, `--wb-muted`).
3. **Adaptive Form Follows Brand Personality**: A legal or financial platform demands conservative token radii (`rounded-md`, 4–6px), muted borders, and restrained elevation. A creator studio or consumer fintech app thrives on hyper-rounded pills (`rounded-full`), dynamic glowing border strokes, and elevated card planes.
4. **Token Consistency Across Viewports**: Token relationships remain proportional as viewport scales shift. Spacing tightens by a factor of 0.75x–0.8x on mobile while preserving visual hierarchy.
5. **State Completeness**: A design system component is only complete when all interactive states (default, hover, focus-visible, active/pressed, disabled, loading, empty, error) are mathematically accounted for.

---

## 2. When to Use vs. When NOT to Use

### When to Activate
- Every commercial, enterprise, or multi-section website generation request.
- When generating consistent palettes, elevation levels, and typography tokens across disparate sections.
- When switching between light, dark, and brand-accented themes.

### When NOT to Over-Apply
- **Brutalist / Post-Modern Art Websites**: Raw brutalist designs deliberately break system grids and standard token scales. Respect user intent if anti-design is requested.
- **One-Off Static Posters / Landing Micro-Teasers**: Avoid over-engineering full token systems for ultra-simple single-fold landing pages.

---

## 3. Design Token Architecture & Mathematical Scales

### A. The 8pt Spatial Scale
| Token | Pixel Value | Rem | Tailwind Equiv | Primary Application |
| :--- | :--- | :--- | :--- | :--- |
| `--wb-space-1` | 4px | 0.25rem | `p-1`, `gap-1` | Micro-badge padding, icon-to-text gap |
| `--wb-space-2` | 8px | 0.5rem | `p-2`, `gap-2` | Button inner padding (vertical), chip spacing |
| `--wb-space-3` | 12px | 0.75rem | `p-3`, `gap-3` | Input field vertical padding, tight card gap |
| `--wb-space-4` | 16px | 1.0rem | `p-4`, `gap-4` | Standard card internal padding (mobile), button px |
| `--wb-space-6` | 24px | 1.5rem | `p-6`, `gap-6` | Card internal padding (desktop), grid column gap |
| `--wb-space-8` | 32px | 2.0rem | `p-8`, `gap-8` | Bento card padding, section sub-group spacing |
| `--wb-space-12` | 48px | 3.0rem | `py-12` | Section vertical rhythm (compact/mobile) |
| `--wb-space-16` | 64px | 4.0rem | `py-16` | Standard section vertical cushion (tablet) |
| `--wb-space-24` | 96px | 6.0rem | `py-24` | Hero section vertical cushion, primary divider |
| `--wb-space-32` | 128px | 8.0rem | `py-32` | High-whitespace editorial and luxury hero cushion |

### B. Border Radius System by Personality
- **Sharp & Clinical (Enterprise, Law, Finance)**: `rounded-none` (0px) to `rounded-sm` (2–4px). Communicates precision and institutional stability.
- **Modern Clean (SaaS, Tech, B2B)**: `rounded-lg` (8px) to `rounded-xl` (12px) for cards, `rounded-md` (6px) for inputs.
- **Soft & Friendly (Wellness, Consumer, E-commerce)**: `rounded-2xl` (16px) to `rounded-3xl` (24px) for cards, `rounded-full` for chips and CTAs.
- **Editorial Bespoke (Luxury, Architecture, Dining)**: Asymmetric framing (e.g., `rounded-tl-3xl rounded-br-3xl` paired with `rounded-none` on adjacent corners).

### C. Elevation & Shadow System
- **Level 0 (Flat)**: `box-shadow: none` — Flat borders (`border border-border`).
- **Level 1 (Card Rest)**: `0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)`.
- **Level 2 (Hover / Elevated Card)**: `0 10px 25px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)`.
- **Level 3 (Modal / Floating Drawer)**: `0 20px 35px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.08)`.
- **Tactile Specular Highlight (Dark Mode)**: `inset 0 1px 0 0 rgba(255, 255, 255, 0.1)`.

---

## 4. Semantic Color Tokens & Theme System

Every palette generated must establish 5 semantic color roles:
1. **Background / Surface (`--wb-bg`, `--wb-surface`)**: Neutral baseline. In dark mode, avoid `#000000` pitch black for cards; use `#09090B` or `#121218` to enable border contrast.
2. **Foreground / Text (`--wb-fg`, `--wb-muted-fg`)**: Primary heading text (`--wb-fg`) requires minimum 7:1 contrast; secondary body text (`--wb-muted-fg`) requires minimum 4.5:1.
3. **Primary Accent (`--wb-primary`)**: Single dominant brand color. Reserved strictly for conversion buttons, primary badges, active indicators, and high-intent focal points.
4. **Secondary / Structural Accent (`--wb-secondary`)**: Subtle surface tints (`--wb-primary/10`) for hover states, icon backdrops, and active tab containers.
5. **Feedback Roles (`--wb-success`, `--wb-warning`, `--wb-destructive`)**: Standard semantic signals for forms, inventory statuses, and validation messages.

---

## 5. Anti-Patterns & Verification Criteria

### Critical Anti-Patterns
- **Token Fragmentation**: Using 14px padding on one card, 19px on another, and 23px on a third. Stick strictly to the 8pt scale.
- **Arbitrary Color Invention**: Introducing uncoordinated random hex colors in nested cards rather than referencing the primary and surface palette.
- **Mismatched Radii**: Combining a pill button (`rounded-full`) inside an ultra-sharp card (`rounded-none`) without an intentional aesthetic rationale.
- **Over-Elevated Shadows**: Muddy, pitch-black drop shadows that look like 2005 CSS rather than modern diffused lighting.

### Quality Checklist
- [ ] Are all margins, paddings, and gaps multiples of 4px or 8px?
- [ ] Does every color token maintain WCAG 2.2 AA contrast?
- [ ] Is border-radius applied consistently across cards, inputs, and buttons?
- [ ] Is elevation conveyed through subtle borders and diffused shadows rather than harsh black blurs?
- [ ] Are all interactive components verified across hover, focus, active, and disabled states?
