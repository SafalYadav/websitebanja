---
name: websitebanja-performance
description: Core Web Vitals budgets (LCP < 2.5s, CLS < 0.1, INP < 200ms), asset weight limits, and layout stability.
version: 1.0.0
---

# WebsiteBanja AI — Web Performance & Core Web Vitals Intelligence Skill

> **Role**: Runtime Speed Engineering, Core Web Vitals (CWV) Optimization, Asset Budgeting, and Zero-Jank Rendering.  
> **Source**: Google Web Vitals engineering specs (LCP, INP, CLS), browser rendering pipeline mechanics (Blink/WebKit compositor), Next.js optimization guidelines.  
> **Application Priority**: Sub-Second Perceived Speed > Core Web Vitals Compliance > Minimal Bundle Weight > Visual Effects.

---

## 1. Core Philosophy: Speed is the Foundation of User Experience

A website that takes 4 seconds to load loses over 50% of its visitors before the first word is read. High-end visual design and high conversion rates are impossible without blistering performance.

### Core Web Vitals (CWV) Thresholds (Strict Pass Standards)
| Metric | Full Name | Pass Threshold | What It Measures | Primary Optimization |
| :--- | :--- | :--- | :--- | :--- |
| **LCP** | Largest Contentful Paint | **< 2.5 seconds** | Perceived Loading Speed | Preload hero image/font, minimize render-blocking JS, prioritize above-the-fold HTML. |
| **INP** | Interaction to Next Paint | **< 200 milliseconds**| Interface Responsiveness | Offload main-thread CPU work, keep click handlers lightweight, debounce expensive filters. |
| **CLS** | Cumulative Layout Shift | **< 0.1** | Visual Stability | Set explicit aspect ratios on all images/videos; reserve fixed layout space for dynamic items. |

---

## 2. Image Optimization & Layout Shift Elimination

Images account for over 60% of total web page weight and are the #1 cause of poor LCP and CLS scores:
1. **Explicit Dimensions**: Always supply explicit `width` and `height` (or aspect-ratio CSS) to every `<img>` and visual container:
   ```html
   <img src="/hero.webp" width="1200" height="675" className="aspect-video w-full object-cover" alt="..." />
   ```
   Without explicit dimensions, the browser cannot reserve space during layout calculation, causing the entire page to violently jump when the image finishes loading (CLS penalty).
2. **Above-the-Fold vs. Below-the-Fold Loading**:
   - **Hero Image (LCP Element)**: Load immediately with `fetchpriority="high"` or Next.js `priority`. NEVER lazy-load the hero image.
   - **All Subsequent Images**: Apply `loading="lazy"` so they download only as the user scrolls into proximity.
3. **Next-Gen Image Formats**: Serve modern WebP and AVIF formats, which compress 30% to 50% smaller than legacy JPEG/PNG with zero perceptual quality loss.

---

## 3. Server-First Architecture & Bundle Discipline

1. **Server Components by Default**: In Next.js App Router, keep all layouts, copy, headers, and footers as **React Server Components (RSC)**. They output pure HTML with zero client-side JavaScript overhead.
2. **Isolate Client Components to Interactive Leaves**:
   - Only add `"use client"` to the specific small interactive leaf (e.g., `<MobileMenuDrawer>`, `<InteractivePricingToggle>`, `<FramerMotionCard>`).
   - Never place `"use client"` at the root layout level, as this forces the browser to download and hydrate the entire application bundle.
3. **Dynamic Lazy-Loading for Heavy Libraries**:
   - Heavy visual libraries (Three.js 3D canvases, Chart.js/Recharts data dashboards, code syntax highlighters) must be loaded dynamically on demand:
     ```tsx
     import dynamic from "next/dynamic";
     const Heavy3DScene = dynamic(() => import("@/components/ThreeScene"), {
       ssr: false,
       loading: () => <div className="h-[400px] bg-muted/20 animate-pulse rounded-2xl" />,
     });
     ```

---

## 4. Compositor-Only Animation Physics

The browser rendering pipeline consists of 4 stages: `JavaScript -> Style -> Layout -> Paint -> Composite`.
- **Compositor Properties (60fps / 120fps)**: `transform` (`translate`, `scale`, `rotate`) and `opacity`. These run directly on the GPU without triggering layout or paint reflows.
- **Forbidden Properties for Animation**: Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` in CSS transitions or tweens. These force continuous CPU layout recalculations and trigger severe frame drops on mobile devices.

---

## 5. Web Font Optimization

- Use Next.js font optimization (`next/font/google`) to self-host fonts locally with zero external Google Fonts DNS round-trips.
- Enforce `display: "swap"` to prevent FOIT (Flash of Invisible Text) while fonts are downloading.
- Limit font weights to strictly what is used: e.g., Regular (400) and Bold (700). Loading 8 weights (100, 200, 300, 400, 500, 600, 700, 800) adds 400KB of redundant font downloads.

---

## 6. Critical Performance Anti-Patterns

1. **Lazy-Loading the Hero Image**: Adding `loading="lazy"` to the main hero banner, directly delaying LCP by 1.5 to 2.5 seconds.
2. **The 5MB Uncompressed PNG**: Uploading raw 4000x3000px camera photos directly into the web page without resizing or WebP compression.
3. **Synchronous Third-Party Scripts**: Loading external analytics or tracking widgets synchronously in `<head>` without `defer` or `async`, blocking browser DOM parsing.
4. **Layout-Shifting Cookie Banners**: Dropping a fixed banner into the DOM that pushes all page content down by 100px after 2 seconds (massive CLS violation).
5. **Memory-Leaking Continuous Timers**: Running un-throttled scroll event listeners or continuous particle canvas loops in background tabs without pausing on `visibilitychange`.

---

## 7. Pre-Ship Performance Quality Checklist

- [ ] Does the page achieve an estimated LCP under 2.5 seconds on a simulated mobile connection?
- [ ] Do all images and video containers define explicit aspect ratios to guarantee CLS < 0.1?
- [ ] Is the hero image preloaded/prioritized, and all below-the-fold imagery lazy-loaded?
- [ ] Are animations strictly confined to GPU compositor properties (`transform` and `opacity`)?
- [ ] Are heavy interactive widgets (3D canvases, interactive charts) dynamically loaded?
- [ ] Is client JavaScript restricted strictly to interactive leaf components?
