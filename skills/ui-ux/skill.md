---
name: websitebanja-ui-ux
description: Foundational visual hierarchy, 3-second rule, 8pt spatial rhythm, WCAG 2.2 contrast, and conversion architecture.
version: 1.0.0
---

# WebsiteBanja AI — UI/UX Design Intelligence Skill

> **Role**: Comprehensive UI/UX Design Intelligence and Quality Control System for WebsiteBanja AI.  
> **Source**: Derived from the 192 reasoning rules, 79 UI styles, 74 typography pairings, 119 UX guidelines, and multi-platform design datasets of the UI/UX Pro Max architecture.  
> **Application Priority**: User explicit requirements > UX Accessibility & Usability (Critical) > Visual Aesthetics & Styling > Conversion Architecture.

---

## 1. Design Philosophy

1. **Content-First, Purpose-Driven Design**: Every element on screen must serve user intent or business conversion. Avoid decorative clutter, arbitrary shapes, and ornamentation that distracts from core messaging.
2. **Inclusive by Default**: Accessibility is not an afterthought; it is the fundamental floor of quality. If an interface is inaccessible to keyboard or screen-reader users, it is defective.
3. **Adaptive Form Follows Product Type**: A B2B healthcare platform demands clinical clarity, high trust, and strict WCAG AA contrast; an indie creator portfolio thrives on bold typography and creative asymmetry. Never force one visual idiom across all industries.
4. **Predictable Mental Models**: Leverage standard platform conventions (back navigation, form field labels, primary CTA placement). Users spend most of their time on other sites; honor familiar mental models rather than reinventing core interaction mechanics.
5. **Calm, High-Performance Experience**: Zero layout jumps (CLS < 0.1), instant tap feedback (<100ms), smooth 60fps transitions, and sub-second perceived load time through progressive disclosure and skeleton placeholders.

---

## 2. Visual Hierarchy

1. **The 3-Second Scanning Rule**: A user scanning a page must comprehend: (a) What this is, (b) Who it is for, and (c) What action to take within 3 seconds.
2. **Three-Tier Typographic Scale**:
   - **Primary (Display / H1)**: 36px–56px on mobile, 48px–72px on desktop. Bold (700–900). One per page.
   - **Secondary (H2 / H3 / Section Titles)**: 24px–36px. Semi-bold (600–700). Groups related subsections.
   - **Body / Labels**: 16px base body (never < 14px on mobile), 12px–14px for auxiliary labels and metadata.
3. **Hierarchy Enforcers**:
   - **Size**: Reserve 2x scale jumps between primary titles and body text.
   - **Weight**: Bold (700) for headlines, Medium (500) for interactive labels/chips, Regular (400) for long-form reading.
   - **Color Luminance**: Use high-contrast color for primary headings (e.g., slate-900 / white), muted tones for secondary support (slate-600 / zinc-400), and subtle tint for borders/dividers. Never rely on color alone to denote importance.
   - **Spatial Isolation**: Enclose primary conversion focal points with 1.5x–2x larger whitespace cushions than secondary elements.

---

## 3. Layout and Composition Rules

1. **Page Structure & Section Sequencing**:
   - Standard conversion flow: `Navbar -> Hero -> Social Proof / Authority -> Features / Benefits -> Interactive Demo / Showcase -> Testimonials -> Pricing / Offer -> FAQ -> Final CTA -> Footer`.
   - Alternating Section Rhythm: Alternate background shades (e.g., `#FFFFFF` to `#F8FAFC` or `#09090B` to `#121218`) between consecutive sections to create distinct cognitive resting stops.
2. **Asymmetry vs. Symmetry**:
   - **Balanced Asymmetry**: Hero sections with text on left (60%) and interactive visual/card on right (40%) on desktop.
   - **Modular Symmetry**: Features, pricing, and testimonial sections benefit from structured multi-column grids (3 or 4 columns).
3. **Z-Index Layering Scale**:
   - Base Content: `z-0`
   - Sticky Section Headers / Floats: `z-10`
   - Fixed Navigation Bar: `z-40`
   - Drawer / Side Sheet: `z-50`
   - Modal Backdrop & Dialog: `z-50` / `z-60`
   - Toast Notifications / Floating Tooltips: `z-70` / `z-80`
4. **Content Measure (Line Length)**:
   - Body prose: Limit to **45–75 characters per line** (`max-w-prose` or `max-w-2xl`). Overly wide paragraphs cause visual disorientation when eye tracking returns to the next line.

---

## 4. Typography System

1. **Curated Font Personalities by Vertical**:
   - **SaaS & Modern Tech**: `Inter`, `Plus Jakarta Sans`, `Geist`, `DM Sans`.
   - **Luxury, Editorial & Wellness**: `Cormorant Garamond` (Heading) + `Montserrat` / `Inter` (Body).
   - **Finance & Corporate Enterprise**: `Plus Jakarta Sans` or `Manrope` (Heading) + `Inter` (Body).
   - **Creative, Agency & Bold**: `Syne` / `Clash Display` (Heading) + `Space Grotesk` / `Inter` (Body).
   - **Developer Tools & Data**: `JetBrains Mono` / `Fira Code` (Code & Data) + `Inter` / `Geist` (UI).
2. **Font Pairing Rules**:
   - Limit to **2 font families max** (1 heading, 1 body).
   - Match x-heights and visual weight so body text remains harmonious.
   - Load only required weights (400, 500, 600, 700). Never load 9 weights of a single font.
3. **Line Height (`leading`) Standards**:
   - Large Headings (H1/H2): `1.1 – 1.25` (tight tracking, e.g., `leading-tight` or `tracking-tight`).
   - Body Paragraphs: `1.5 – 1.65` (e.g., `leading-relaxed`).
   - Small Caps / Badges: `1.2 – 1.4` with `tracking-wider` (+0.05em).
4. **Tabular Figures for Numbers**:
   - Always use `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`) for pricing tiers, timers, KPI metrics, and financial columns to prevent jitter during updates.

---

## 5. Spacing System & 8pt Grid

1. **8pt/4pt Mathematical Rhythm**:
   - All padding, margins, and gaps must be multiples of 4px / 8px:
     - `4px` (`0.25rem` / `p-1`): Micro gaps, badge inner padding.
     - `8px` (`0.5rem` / `p-2`): Icon-to-text spacing, compact button padding.
     - `16px` (`1rem` / `p-4`): Standard component padding, input interior.
     - `24px` (`1.5rem` / `p-6`): Card container padding, form row spacing.
     - `32px` (`2rem` / `p-8`): Large card padding, modal interior.
     - `48px` (`3rem` / `py-12`): Compact section separation.
     - `64px`–`96px` (`4rem`–`6rem` / `py-16`–`py-24`): Standard landing page section spacing.
     - `112px`–`128px` (`7rem`–`8rem` / `py-28`–`py-32`): Major hero padding on desktop.
2. **Density Tiers**:
   - **Spacious (Marketing / Landing)**: Section padding 80px–120px; card gap 24px–32px.
   - **Standard (Web App / Public Pages)**: Section padding 48px–64px; card gap 16px–24px.
   - **Compact (Data / Dashboard / Studio)**: Padding 8px–16px; table rows 36px–44px; grid gap 8px–12px.

---

## 6. Grid & Container Rules

1. **Max Container Widths**:
   - Content max-width: `max-w-7xl` (`1280px`) or `max-w-6xl` (`1152px`) for standard desktop layouts.
   - Focused Form / Hero: `max-w-3xl` (`768px`) or `max-w-4xl` (`896px`).
   - Reading Column: `max-w-2xl` (`672px`) centered with `mx-auto`.
2. **Horizontal Inset / Gutters**:
   - Mobile (<640px): `px-4` (16px) or `px-6` (24px).
   - Tablet (640px–1024px): `px-6` (24px) or `px-8` (32px).
   - Desktop (>1024px): `px-8` (32px) or `px-12` (48px) within the centered container.
3. **CSS Grid Best Practices**:
   - Responsive auto-fill grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8`.
   - Never hardcode fixed pixel widths on grid children (`width: 380px`); always use fractional units (`1fr`) or minmax (`minmax(280px, 1fr)`).

---

## 7. Color Usage & Palette Discipline

1. **The 60-30-10 Harmonic Distribution Rule**:
   - **60% Dominant Base**: Background surface (#FFFFFF or #09090B, slate-50, zinc-900).
   - **30% Structural Secondary**: Cards, sidebars, borders, typography, subtle tints (#F1F5F9, #18181B).
   - **10% High-Impact Accent**: Primary CTA buttons, badges, key active states, focus rings.
2. **Semantic Color Tokens (Never Hardcode Raw Hex in Components)**:
   - `primary`: Brand signature color.
   - `secondary`: Supporting structure.
   - `accent`: Attention focal point / conversion driver.
   - `success`: `#22C55E` / `#16A34A` (accessible on white & dark).
   - `warning`: `#F59E0B` / `#D97706`.
   - `destructive` / `error`: `#EF4444` / `#DC2626`.
   - `surface` / `card`: Light `#FFFFFF`, Dark `#18181B` / `#121218`.
   - `border`: Light `rgba(0,0,0,0.08)`, Dark `rgba(255,255,255,0.08)`.
3. **Dark Mode Architecture**:
   - Dark mode is NOT color inversion.
   - Backgrounds should use deep charcoal or midnight tones (`#09090B`, `#0D1117`, `#121218`) rather than pure saturated colors.
   - Surface elevation uses progressive lightness: Base (`#09090B`), Card (`#18181B`), Popover/Modal (`#27272A`).
   - Accent colors in dark mode should be slightly desaturated (+10–15% lightness, -10% saturation) to prevent eye strain and chromatic aberration against dark surfaces.

---

## 8. Contrast & Readability (WCAG 2.2 Standards)

1. **Normal Text (< 18pt / < 24px regular)**:
   - Minimum **4.5:1 contrast ratio** against its immediate background.
   - Light mode: Use `slate-900` (#0F172A) or `zinc-900` (#18181B) on white/light gray. Never use light gray text (#94A3B8) for body reading.
   - Dark mode: Use `zinc-100` (#F4F4F5) or `slate-100` (#F1F5F9).
2. **Large Text (>= 18pt bold or >= 24px regular)**:
   - Minimum **3.0:1 contrast ratio**.
3. **Non-Text UI Elements (Icons, Button Borders, Active Indicators)**:
   - Minimum **3.0:1 contrast ratio** against adjacent background.
4. **Never Rely on Color Alone**:
   - Form errors, system status badges, and chart metrics must pair color with an icon (e.g., checkmark, alert triangle) or explicit textual label.

---

## 9. Buttons and Calls-to-Action (CTAs)

1. **Single Primary CTA per Viewport**:
   - Only ONE primary button per screen section. All other actions must be secondary (outline), tertiary (ghost/subtle), or link.
   - Primary: High-contrast solid fill, prominent hover state.
   - Secondary: Bordered outline or muted background (`border border-zinc-200 dark:border-white/10`).
   - Tertiary: Text button with subtle hover background (`hover:bg-zinc-100 dark:hover:bg-zinc-800`).
2. **Action-Oriented Copy**:
   - Use high-intent verbs: "Start Free Trial", "Generate Website", "Book Appointment", "Claim Your Domain".
   - Avoid passive, generic copy: "Click Here", "Submit", "Learn More" (unless paired with context).
3. **Touch Targets & Geometry**:
   - Minimum height: **44px** (`h-11`) on mobile, recommended **48px** (`h-12`) for primary CTAs.
   - Padding: `px-6 py-3` for desktop primary; full-width `w-full` on mobile bottom-sheets/forms.
   - Rounded corners: Follow project style token (Sharp `rounded-none`, Modern `rounded-xl`, Playful/Pill `rounded-full`).

---

## 10. Navigation Patterns

1. **Sticky Header Behavior**:
   - Fixed or sticky top bar with backdrop blur (`backdrop-blur-md bg-white/80 dark:bg-black/80`).
   - Subtle bottom border (`border-b border-zinc-200/80 dark:border-white/10`).
   - Reserve page padding top (`pt-20 sm:pt-24`) so underlying content is never obscured.
2. **Desktop vs Mobile Navigation**:
   - Desktop: Horizontal links with 24px–32px gap. Active route indicator (subtle background pill or accent underline).
   - Mobile: Clean burger menu transitioning into a dedicated slide-out drawer or full-screen menu overlay with large touch targets (minimum 48px height per link).
3. **Semantic Anchors**:
   - Always use real anchor tags (`<Link href="...">`) for navigable destinations, not `<div onClick>` or `<button onClick>`, ensuring search crawlers and screen readers navigate smoothly.
4. **Maximum Navigation Items**:
   - Top nav bar: 4 to 6 core links maximum. Secondary items (legal, status, docs) belong in the footer or user profile dropdown.

---

## 11. Hero Sections

1. **Anatomy of a High-Converting Hero**:
   - **Eyebrow / Badge**: Small pill badge with icon indicating new release, category, or social proof ("Next-Gen Autonomous AI Builder").
   - **Primary Headline (H1)**: 40px–72px. Concise, punchy benefit-driven statement (6–10 words).
   - **Support Description**: 16px–20px. 2 to 3 lines maximum explaining the solution and removing friction ("No credit card required. Launch in 60s.").
   - **CTA Cluster**: Primary CTA button paired with a secondary action ("Watch Demo", "Explore Showcase") or social proof snippet (user avatars + "Trusted by 2,000+ creators").
   - **Hero Visual / Interactive Artifact**: Real product preview, interactive mockup, video walkthrough, or live canvas snapshot.
2. **Visual Ergonomics**:
   - Ensure headline and primary CTA reside above the fold on 1080p desktop and modern mobile viewports (min-h-[85vh] to min-h-screen).

---

## 12. Cards and Content Containers

1. **Elevation and Depth Scale**:
   - Flat / Minimal: 1px border (`border border-zinc-200/80 dark:border-white/10`), zero shadow.
   - Modern Standard: 1px border + soft subtle shadow (`shadow-xs` or `shadow-sm hover:shadow-md transition-shadow`).
   - Floating / Overlay: Deeper shadow (`shadow-xl dark:shadow-2xl`) with backdrop blur.
2. **Internal Card Spacing & Structure**:
   - Header (Icon + Title), Body (Description), Footer (Action / Link).
   - Padding: `p-6` (24px) or `p-8` (32px).
   - Consistency: In a grid of cards, equalize heights using `flex flex-col justify-between` or CSS Grid `h-full`.

---

## 13. Forms and Inputs

1. **Persistent Visible Labels**:
   - Always place a visible `<label>` above every input. Placeholders are for temporary format hints ("e.g. Acme Studio"), NEVER as replacements for labels.
2. **Semantic Input Types & Autocomplete**:
   - Use `type="email"`, `type="tel"`, `type="number"`, `type="password"`.
   - Provide appropriate `autocomplete` attributes (`email`, `username`, `current-password`, `tel`).
3. **Input Sizing & Affordances**:
   - Height: Minimum 44px (`h-11`) for mobile accessibility.
   - Clear focus state: 2px–3px high-contrast ring (`focus:ring-2 focus:ring-violet-500 focus:outline-none`).
   - Clear error state: Red border (`border-red-500`), error text below input connected via `aria-describedby`, error icon inside field.
4. **Validation UX**:
   - Validate inline on blur (after user leaves the field), not on every keystroke while they are typing.
   - For failed multi-field form submissions, place an error summary at the top and shift keyboard focus to the summary or first invalid field.

---

## 14. Tables and Data Lists

1. **Table Structure**:
   - Clean column headers with clear horizontal borders.
   - Use `tabular-nums` for numeric, date, and currency columns. Right-align numeric columns; left-align text columns.
   - Alternate row striping or subtle hover row highlight (`hover:bg-zinc-50 dark:hover:bg-zinc-900/50`) to guide eye tracking.
2. **Responsive Handling**:
   - Never allow tables to break mobile layouts: provide horizontal scroll wrappers (`overflow-x-auto`) or transform rows into mobile stacked card views on `<768px`.

---

## 15. Dashboards and Data Density

1. **KPI Stat Cards**:
   - Standard format: Metric Label (small, muted), Large Stat Value (32px–40px, bold tabular), Trend Indicator (+12% with green up arrow / -3% with red down arrow).
2. **Data-Dense Grids**:
   - Use 8px–12px padding in dense views to maximize visible information without cluttering.
   - Provide explicit search, filtering, and sort controls.

---

## 16. Landing Pages & Conversion Architecture

1. **5 Canonical Landing Page Patterns**:
   - **Pattern 1: Hero + Features + CTA**: Standard SaaS/B2B pattern. Clean progression from problem to features to conversion.
   - **Pattern 2: Hero + Testimonials + Social Proof**: Trust-heavy pattern for healthcare, agencies, courses, consulting.
   - **Pattern 3: Product Demo + Interactive Showcase**: Tool/dev-focused pattern where seeing the product interface drives intent.
   - **Pattern 4: Minimal Single Column**: Indie hacker / micro-SaaS pattern. Highly focused, single CTA, zero nav distractions.
   - **Pattern 5: Funnel (3-Step Progression)**: Service/booking pattern: Step 1 (Problem) -> Step 2 (Process) -> Step 3 (Launch).
2. **Social Proof Placement**:
   - Place logo strip or review rating immediately below the primary hero section before diving into long feature descriptions.

---

## 17. Content Hierarchy & Scannability

1. **Chunking & Digestibility**:
   - Limit bullet points to 3–5 items per group.
   - Break large walls of text into micro-paragraphs (2–3 sentences max).
   - Use bold lead-ins for feature lists: "**60-Second Generation**: Build complete websites instantly."

---

## 18. Responsive & Mobile-First Execution

1. **Mobile Breakpoints Standard**:
   - Mobile: `375px – 640px` (single column, full-width buttons, collapsible menus).
   - Tablet: `640px – 1024px` (2 columns, compact headers).
   - Desktop: `1024px – 1440px+` (3–4 columns, full sidebars, split hero).
2. **Touch Target Standard**:
   - Every interactive element must be at least **44x44px** hit target area.
   - Maintain at least **8px gap** between adjacent touch targets to prevent accidental mis-taps.
3. **No Horizontal Scroll**:
   - `overflow-x: hidden` on viewport roots. All images, code blocks, and flex containers must adapt or wrap (`flex-wrap`).

---

## 19. Accessibility (WCAG 2.2 AA Mandatory)

1. **Keyboard Operability**:
   - Every clickable element must be reachable and operable via `Tab` and `Enter` / `Space`.
   - Never suppress outline focus without providing a visible focus ring replacement (`focus-visible:ring-2`).
2. **Screen Reader Semantics**:
   - Landmark regions: `<header>`, `<nav>`, `<main>`, `<section>`, `<aside>`, `<footer>`.
   - Heading hierarchy: Exactly one `<h1>` per page; sequential `<h2>`, `<h3>` with no skipped levels.
   - Image Alt Text: Meaningful descriptive text on informative images; `alt=""` and `aria-hidden="true"` on decorative icons/illustrations.
   - Icon Buttons: Any button containing only an icon must declare an explicit `aria-label="Close dialog"` or `aria-label="Open menu"`.

---

## 20. Interaction Design & Feedback States

1. **The 5 Universal Component States**:
   - **Default**: Clean, restful state.
   - **Hover**: Subtle lift (`translate-y-[-2px]`), background tint shift, or border highlight (desktop only).
   - **Focus / Focus-Visible**: 2px–3px high-contrast ring with offset (`ring-2 ring-violet-500 ring-offset-2`).
   - **Active / Pressed**: Micro scale-down (`scale-[0.98]`) providing tactile feedback.
   - **Disabled**: Reduced opacity (40–50%), `cursor-not-allowed`, non-interactive (`pointer-events-none`).
2. **Instant Response Guarantee**:
   - Provide visual acknowledgment of any tap/click within **100ms**.

---

## 21. Loading, Empty, and Error States

1. **Loading State UX**:
   - Operations under 300ms: Do not flash a spinner.
   - Operations between 300ms–2s: Use an inline button spinner or skeleton shimmer.
   - Operations > 2s: Provide an informative progress bar with human-readable status ("Generating section copy...", "Finalizing layout...").
2. **Empty State Architecture**:
   - 3-part formula: (a) Relevant illustration/icon, (b) Clear explanation ("No websites created yet"), and (c) Immediate call-to-action button ("Create Your First Website").
3. **Error State Recovery**:
   - Always explain *what went wrong* and *how to fix it*. Never show generic "An error occurred". Provide a "Try Again" or "Contact Support" recovery button.

---

## 22. Micro-Interactions & Animation Principles

1. **Timing & Duration Tiers**:
   - **Micro-interactions (hover, active, toggles)**: `100ms – 200ms`.
   - **Medium Transitions (dropdowns, tabs, dialogs)**: `200ms – 350ms`.
   - **Large Orchestration (page transitions, complex modal entry)**: `350ms – 500ms`.
2. **Easing Functions**:
   - Enter transitions: Deceleration (`ease-out` / `cubic-bezier(0.16, 1, 0.3, 1)`).
   - Exit transitions: Acceleration (`ease-in`).
   - Exit animations should be **30–40% faster** than entry animations to keep the interface feeling snappy.
3. **Motion Performance & Safety**:
   - Only animate composite properties: `transform` and `opacity`. NEVER animate `width`, `height`, `top`, or `margin` (causes layout reflow / jank).
   - **Prefers-Reduced-Motion**: Always respect `prefers-reduced-motion: reduce` by disabling non-essential motion or replacing slide/scale animations with instant fades.

---

## 23. Icons & Visual Asset Discipline

1. **Strict Vector Rule**: Use high-quality SVG vector icons (e.g. Lucide Icons, Heroicons).
2. **Zero Emojis as Structural Icons**: NEVER use emojis (🚀, 💡, 🔥, ⚡) as replacement for navigation, feature card headers, or UI action buttons. Emojis look amateur, render inconsistently across operating systems, and cannot inherit design tokens.
3. **Single Icon Family**: Never mix stroke widths (e.g., mixing 1px thin line icons with 2.5px heavy icons) or styles (mixing two-tone filled with thin outline) in the same component tier.

---

## 24. Anti-Patterns & Critical Mistakes to Avoid

1. **The "AI Gradient Salad"**: Avoid slapping gratuitous purple/pink/cyan radial gradients across every card and text block. Use gradients sparingly and intentionally on key focal points.
2. **Low-Contrast Gray-on-Gray**: Avoid `#888888` text on `#18181B` dark cards or `#A0A0A0` text on `#FFFFFF` white cards.
3. **Placeholder-Only Form Fields**: Omitting labels causes users to forget what they were typing once the input is filled.
4. **Unresponsive Fixed Modals**: Modals that overflow smaller screens with unreachable close buttons.
5. **Layout Thrashing Transitions**: Hover effects that expand width or padding, nudging neighboring elements and causing visual jitter.
6. **Dead-End States**: Any screen or error message with no navigational path back to safety.

---

## 25. Pre-Delivery Quality Checklist

Before finalizing any generated website or UI design, audit against this checklist:

- [ ] **Contrast**: All body text >= 4.5:1; all large headings and UI icons >= 3.0:1.
- [ ] **No Emojis as Icons**: All icons are clean vector SVGs (Lucide).
- [ ] **Hierarchy**: Single clear `h1`; logical `h2` and `h3` heading progression.
- [ ] **Touch Targets**: All interactive elements are >= 44x44px on mobile.
- [ ] **Responsive Test**: Flawless reflow at 375px (mobile), 768px (tablet), and 1280px (desktop). Zero horizontal scroll.
- [ ] **Interactive Feedback**: Every button and link has visible hover, active, and focus states.
- [ ] **Forms**: All inputs have persistent labels, helper text, and clear inline validation.
- [ ] **Reduced Motion**: All animations yield gracefully to `prefers-reduced-motion`.
- [ ] **Content Integrity**: All copy is tailored to the user's specific business and category, avoiding generic lorem ipsum.
