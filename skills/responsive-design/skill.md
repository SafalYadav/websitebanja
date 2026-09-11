---
name: websitebanja-responsive-design
description: Mobile-first thumb-zone ergonomics, fluid grid reflows, 44x44px touch targets, and zero-overflow rules.
version: 1.0.0
---

# WebsiteBanja AI — Responsive Design Intelligence Skill

> **Role**: Mobile-First Geometry, Fluid Viewport Adaptation, Touch Affordance Engineering, and Breakpoint Choreography.  
> **Source**: Modern CSS Grid and Flexbox standards, viewport physics, touch ergonomic research (Luke Wroblewski / Steven Hoober), and cross-device testing heuristics.  
> **Application Priority**: Mobile Ergonomics & Zero-Overflow > Tablet Structural Adaptation > Desktop Richness > Ultrawide Anchoring.

---

## 1. Core Philosophy: Intentional Mobile Engineering

Responsive design in WebsiteBanja AI is NOT desktop shrinking. It is the art of designing for human hands, small glass surfaces, and divided attention first, then expanding outward into spacious multi-column desktop environments.

### The Responsive Hierarchy
$$\text{Mobile First (375px–640px)} \longrightarrow \text{Tablet Bridge (768px–1024px)} \longrightarrow \text{Desktop Canvas (1280px–1440px)}$$

1. **Mobile Ergonomics (The Thumb Zone)**: 75% of one-handed smartphone use relies on thumb reach. Primary conversion actions and navigation triggers must sit within the comfortable lower and middle viewport areas, never trapped at the extreme top corners.
2. **Fluid Grid Reflow**: Desktop multi-column layouts (3 or 4 columns) reflow into clean 2-column or 1-column cards. Never force users to pinch-zoom or squint at microscopic desktop columns squeezed onto mobile.
3. **Zero Horizontal Overflow Tolerance**: An unintended horizontal scrollbar (`overflow-x`) on mobile destroys user trust instantly and signals a broken layout. Every container width must be fluid (`w-full`, `max-w-full`) with padding.
4. **Touch Target Law**: Every tap target (button, menu link, form input, accordion header) must be at least **44×44px** (ideally **48×48px**) with at least **8px of surrounding clearance**.

---

## 2. Standard Breakpoint System

| Breakpoint | Viewport Range | Core Layout Behavior | Navigation Mode |
| :--- | :--- | :--- | :--- |
| **Mobile (`sm`)** | `375px – 639px` | Single-column stack (`grid-cols-1`). Tightened padding (`px-4 py-12`). Large full-width CTAs. | Hamburger button -> full-screen or slide-out drawer |
| **Tablet (`md`)** | `640px – 1023px`| 2-column modular grids (`grid-cols-2`). Moderate padding (`px-6 py-16`). Balanced typography. | Condensed menu bar or drawer |
| **Desktop (`lg`)** | `1024px – 1279px`| 3 or 4-column grids (`grid-cols-3` / `grid-cols-4`). Asymmetrical bento layouts. Split hero (60/40). | Full horizontal navigation bar with dropdowns |
| **Wide Desktop (`xl`)** | `1280px – 1535px`| Centered container (`max-w-7xl mx-auto`). Generous whitespace cushions (`py-24`). | Full navigation with extended CTA group |
| **Ultrawide (`2xl`)** | `1536px+` | Hard container bounds (`max-w-[1440px] mx-auto`). Never let content stretch into an infinite line. | Anchored desktop nav |

---

## 3. Component-Specific Responsive Adaptations

### A. Navigation & Headers
- **Desktop**: Horizontal links with hover indicators and a prominent right-aligned CTA button.
- **Mobile**: Hamburger icon button (`w-11 h-11 flex items-center justify-center`) triggering an accessible slide-out sheet (`z-50`) with minimum 48px vertical spacing between menu links.

### B. Tables & Data Grids
- **Desktop**: Full data table with columnar alignment.
- **Mobile**: 
  - *Option 1 (Preferred)*: Transform tabular rows into individual summary cards with labeled key-value pairs.
  - *Option 2*: Enclose within a smooth horizontal swipe container with a visible fade gradient indicator: `<div className="overflow-x-auto -mx-4 px-4">`.

### C. Bento Grids
- **Desktop**: Asymmetrical mosaic with `col-span-1`, `col-span-2`, and variable row heights.
- **Mobile**: Collapse all cards to `col-span-1`, stacking in a natural vertical narrative order with uniform 16px gaps.

### D. Pricing Tables
- **Desktop**: 3 cards side-by-side with the "Most Popular" card visually elevated.
- **Mobile**: Vertically stacked cards with the "Most Popular" card displayed first or prominent badge. Include quick anchor jump links to view feature differences.

---

## 4. Mobile Bottom Sticky CTA Bar

For high-intent conversion websites (local service emergency booking, e-commerce checkout, restaurant table booking):
- Display a fixed bottom action bar on mobile (`fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md p-4 border-t z-40 lg:hidden`).
- House the single most important action: `"Call Now (555) 019-2834"` or `"Book Table"`.
- Provide sufficient bottom padding on the `<body>` (`pb-24 lg:pb-0`) so content is never obscured by the floating bar.

---

## 5. Critical Responsive Anti-Patterns

1. **The Desktop Shrink Syndrome**: Scaling down desktop CSS font sizes and padding linearly without re-architecting the layout flow, leaving micro-text and unusable click targets.
2. **The Horizontal Scroll Disaster**: Setting fixed pixel widths (`w-[600px]` or `min-w-[500px]`) on cards or containers, forcing horizontal page overflow on small phones.
3. **Microscopic Touch Targets**: Tiny inline links or icons (<30px) placed close together, causing accidental wrong clicks.
4. **The Sticky Header Screen Hog**: A mobile header that consumes >20% of the vertical screen space, leaving almost no room to read the actual website. Keep mobile headers under 60px height.
5. **Disabled Pinch-Zoom**: Setting `user-scalable=no` or `maximum-scale=1` in the viewport meta tag. This breaks accessibility for visually impaired users.

---

## 6. Pre-Ship Responsive Quality Checklist

- [ ] Does the website display zero horizontal overflow on an iPhone (375px width)?
- [ ] Are all touch targets at least 44×44px with comfortable finger clearance?
- [ ] Do multi-column grids collapse cleanly to 1 or 2 columns on mobile screens?
- [ ] Is mobile navigation accessible via a smooth slide-out sheet or drawer?
- [ ] Are desktop tables gracefully converted into cards or scrollable containers on mobile?
- [ ] Is primary conversion copy easily readable without zooming?
