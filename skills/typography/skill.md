---
name: websitebanja-typography
description: Font pairing personalities, modular typographic scale, optical tracking/leading, and fluid clamp() rules.
version: 1.0.0
---

# WebsiteBanja AI — Typography Design Intelligence Skill

> **Role**: Typographic Scale Systems, Font Pairing Engineering, Optical Readability, and Expressive Letterform Hierarchy.  
> **Source**: Classical typographic craft (Bringhurst), modern digital screen legibility standards, Web Type modular scales, and CSS fluid typography physics.  
> **Application Priority**: User Stated Style/Brand > Optical Readability & Legibility > Typographic Scale Math > Expressive Flair.

---

## 1. Core Philosophy: Voice, Legibility & Spatial Math

Typography is 90% of web design. Typography conveys brand emotion before a single word is read and governs cognitive fluency while reading.

### The 4 Pillars of Screen Typography
1. **Expressive Display vs. Invisible Body**: Headings set the emotional tone (bold, quirky, elegant, technical); body text must become functionally invisible, getting out of the reader's way so comprehension is effortless.
2. **Harmonic Modular Scale**: Type sizes do not scale arbitrarily. Every size increment derives from a mathematical ratio (e.g., Major Third `1.25` or Perfect Fourth `1.333`).
3. **Optical Leading & Tracking Inversion**:
   - **Large Display Titles**: Demand tighter tracking (`tracking-tight` or `-0.02em` to `-0.04em`) and compact line heights (`1.05` to `1.15`). Loose leading on huge text creates awkward visual gaps.
   - **Small Caps & Auxiliary Metadata**: Demand wider tracking (`tracking-wider` or `+0.05em` to `+0.1em`) and relaxed leading to prevent small letterforms from colliding.
4. **The 65-Character Measure**: Body prose must never exceed **45 to 75 characters per line** (`max-w-prose` or `max-w-2xl`). Overly wide lines cause reader fatigue and eye-tracking disorientation.

---

## 2. Modular Typographic Scale (Desktop vs. Mobile)

Using the **Major Third Scale (1.25x)** for standard applications:

| Token | Desktop (rem / px) | Mobile (rem / px) | Weight | Line Height | Tracking | Primary Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display` | `3.75rem / 60px` | `2.5rem / 40px` | 800–900 | `1.1` | `-0.03em` | Hero Statement (1 per page) |
| `h1` | `3.0rem / 48px` | `2.0rem / 32px` | 700–800 | `1.15` | `-0.025em` | Page Title / Section Anchor |
| `h2` | `2.25rem / 36px` | `1.625rem / 26px` | 600–700 | `1.2` | `-0.02em` | Major Section Header |
| `h3` | `1.5rem / 24px` | `1.25rem / 20px` | 600 | `1.3` | `-0.01em` | Card Title / Feature Heading |
| `h4` | `1.25rem / 20px` | `1.125rem / 18px` | 600 | `1.35` | `0` | Subsection / Bento Title |
| `body-lg` | `1.125rem / 18px` | `1.0rem / 16px` | 400–500 | `1.55` | `0` | Hero Subtitle, Lead Paragraph |
| `body` | `1.0rem / 16px` | `0.9375rem / 15px`| 400 | `1.6` | `0` | Standard Body Prose |
| `caption` | `0.875rem / 14px` | `0.8125rem / 13px`| 400–500 | `1.4` | `0` | Form Input, Card Metadata |
| `micro` | `0.75rem / 12px` | `0.75rem / 12px` | 600 | `1.2` | `+0.05em` | Uppercase Eyebrow Badge |

---

## 3. Curated Font Pairing Personalities by Vertical

| Vertical / Style Archetype | Display / Heading Font | Body & Interface Font | Characteristic Vibe |
| :--- | :--- | :--- | :--- |
| **Modern B2B SaaS / Tech** | `Inter` / `Plus Jakarta Sans` / `Geist` | `Inter` / `Geist Sans` | Ultra-clean, neutral, high-legibility engineered surface |
| **Luxury Hospitality / Fine Dining** | `Playfair Display` / `Cormorant Garamond` | `Lato` / `Montserrat` / `Inter` | Elegant, refined, high optical contrast, bespoke editorial |
| **Developer Tools / Cloud Infrastructure** | `JetBrains Mono` / `Space Grotesk` | `Inter` / `Fira Code` | Technical, precision-focused, authentic hacker aesthetic |
| **Boutique Creative Agency / Studio** | `Syne` / `Clash Display` | `Plus Jakarta Sans` / `Work Sans` | High-character, avant-garde, bold typographic impact |
| **Healthcare / Clinic / Legal** | `Manrope` / `Merriweather` | `Inter` / `Source Sans Pro` | High trust, warm institutional clarity, accessible legibility |
| **E-Commerce / Direct-to-Consumer** | `Outfit` / `DM Sans` | `Inter` / `DM Sans` | Approachable, commercial, punchy numbers and currency glyphs |

---

## 4. Fluid Typography with CSS `clamp()`

Never hardcode brittle breakpoint jumps that snap awkwardly when resizing windows. Use fluid typography:
```css
/* Fluid Hero Headline: Scales from 36px on mobile (375px) to 64px on desktop (1440px) */
font-size: clamp(2.25rem, 1.5rem + 3.2vw, 4.0rem);

/* Fluid Section Headline: Scales from 24px to 36px */
font-size: clamp(1.5rem, 1.15rem + 1.5vw, 2.25rem);
```

---

## 5. Critical Typographic Anti-Patterns

1. **The 3-Font Chaos**: Using more than 2 distinct font families on a single website. Stick strictly to 1 Display family + 1 Body family (or 1 versatile superfamily like `Inter` across weights).
2. **Tight Body Leading**: Setting body text `line-height` below `1.4`. Body text requires `1.5` to `1.65` for comfortable reading.
3. **The Unbroken Super-Line**: Allowing body text to stretch 100% full-width across a 1920px screen without a `max-w-2xl` or `max-w-prose` constraint.
4. **All-Caps Body Text**: Setting full paragraphs in uppercase. Uppercase eliminates distinctive ascenders and descenders, reducing reading speed by up to 30%. Reserve uppercase strictly for 1–3 word eyebrow badges.
5. **Low-Contrast Subtext**: Fading secondary copy into barely visible light gray (`#D1D5DB` on white background) that fails WCAG AA minimum 4.5:1 ratio.

---

## 6. Pre-Ship Typography Verification Checklist

- [ ] Does the page use no more than 2 font families?
- [ ] Is headline tracking appropriately tighter (`-0.02em`) and uppercase badge tracking wider (`+0.05em`)?
- [ ] Are body paragraphs capped at `65–75` characters per line (`max-w-prose`)?
- [ ] Does body text have at least `1.5` line-height?
- [ ] Is there clear optical contrast between H1, H2, and H3 sizes?
- [ ] Does all text achieve WCAG AA contrast (4.5:1 for normal body, 3:1 for large display)?
