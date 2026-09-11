---
name: websitebanja-gsap
description: Timeline orchestration, ScrollTrigger scrollytelling, pinning mechanics, and cinematic scroll choreography.
version: 1.0.0
---

# WebsiteBanja AI — GSAP & Advanced Animation Intelligence Skill

> **Role**: Timeline Choreography, Scroll-Driven Scrollytelling, Advanced Pinning Physics, and Cinematic Web Sequences.  
> **Source**: GreenSock Animation Platform (GSAP 3) runtime specifications, ScrollTrigger architecture, SplitText typography mechanics, and high-end agency engineering standards.  
> **Application Priority**: User Explicit Animation Vision > Scrollytelling Narrative Value > 60fps Rendering Stability > Restraint.

---

## 1. Core Philosophy: Intentional Cinematic Choreography

GSAP is the industry standard for high-end cinematic web animation and complex timeline choreography. However, advanced animation must never be applied merely because the engine exists.

### GSAP vs. Framer Motion vs. CSS Transitions (Decision Matrix)
| Engine | When To Use | When NOT To Use | Primary Strengths |
| :--- | :--- | :--- | :--- |
| **GSAP + ScrollTrigger** | Continuous scroll scrubbing, section pinning, complex multi-scene timelines, scrollytelling narratives, SplitText character animations. | Standard React UI states, simple hover/tap gestures, basic modal fade-ins. | Infinite timeline control, pinpoint frame accuracy, buttery scroll scrub, robust pinning. |
| **Framer Motion** | React component state animations, declarative gesture physics (hover/tap), layout morphing (`layoutId`), unmount transitions (`AnimatePresence`). | Complex 10-step scripted timelines tied to scroll distance across multiple sections. | Deep React component lifecycle integration, spring physics, zero bundle overhead if already included. |
| **Pure CSS / Tailwind** | Simple micro-interactions (button hover, 150ms focus ring expansion, simple dropdown opacity). | Scripted sequences, viewport triggers, scrub-driven animations. | Zero JavaScript footprint, browser-native compositor acceleration. |
| **Zero Animation** | Minimalist sites, static reading pages, user prefers reduced motion. | Any request where user explicitly asked for static/minimal. | Maximum battery efficiency, instant comprehension. |

---

## 2. Advanced GSAP Architecture Patterns

### A. Timeline Sequencing & Relative Offsets
Avoid disjointed independent tweens. Group coordinated actions into a master timeline with relative time markers (`"<"`, `"-=0.2"`):
```javascript
import gsap from "gsap";

const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.6 } });

tl.from(".hero-badge", { opacity: 0, y: -10 })
  .from(".hero-headline", { opacity: 0, y: 30 }, "-=0.3") // Starts 0.3s before previous ends
  .from(".hero-subtitle", { opacity: 0, y: 20 }, "-=0.2")
  .from(".hero-cta-group", { opacity: 0, scale: 0.95 }, "-=0.2")
  .from(".hero-preview-frame", { opacity: 0, y: 50, duration: 0.8 }, "<"); // Starts at same time
```

### B. ScrollTrigger Scrubbing & Section Pinning
When building interactive product reveals or brand narratives:
- **Pinning Rules**: Pinning locks a section in place while the user scrolls through sequential narrative slides.
  - Section must have deterministic height (`h-screen` or explicit aspect ratio).
  - Limit pinning to maximum **1 or 2 sections per page**; excessive pinning destroys the natural feel of browser scrolling, especially on mobile.
- **Scrubbing Ratio**: Use smooth numerical scrubbing (`scrub: 0.8` or `scrub: 1.2`) rather than `scrub: true`. A small numerical smoothing value eliminates jittery trackpad scrolling.

### C. SplitText Typography Reveals
For high-impact editorial or creative hero headlines:
- Split headline text into words or characters and stagger by **0.015s to 0.03s** with `expo.out` or `power3.out`.
- Always revert SplitText (`split.revert()`) on component unmount to restore clean accessible DOM text for screen readers.
- Never apply SplitText to body paragraphs; restrict strictly to primary headlines under 10 words.

---

## 3. Lifecycle Management & Memory Leak Prevention

In React / Next.js single-page applications, GSAP timelines must be meticulously cleaned up to prevent memory leaks and zombie event listeners:
1. **Always Kill Timelines on Unmount**:
   ```javascript
   useEffect(() => {
     const ctx = gsap.context(() => {
       // All GSAP animations created inside ctx are automatically scoped and killed
       gsap.to(".animated-card", { y: -10 });
     }, containerRef);

     return () => ctx.revert(); // Comprehensive cleanup
   }, []);
   ```
2. **ScrollTrigger.refresh()**: Recalculate scroll triggers after external web fonts, images, or async components have finished loading to prevent offset misalignment.

---

## 4. Critical GSAP Anti-Patterns

1. **The Scroll Hijack Nightmare**: Overriding native browser scroll inertia with rigid custom smooth-scroll scripts that feel laggy or cause nausea on trackpads.
2. **The 3-Second Stagger Wait**: Staggering 20 elements by 0.1s each, making users wait over 2 seconds before being able to interact with the page.
3. **Zombie ScrollTriggers**: Creating ScrollTriggers inside React components without an unmount cleanup function, causing memory consumption to double on every route transition.
4. **Reflow Animation**: Animating `width`, `height`, `left`, or `top` with GSAP instead of `xPercent`, `yPercent`, `scale`, and `rotation`.
5. **Ignoring Reduced Motion**: Failing to check `window.matchMedia("(prefers-reduced-motion: reduce)")` before playing full-screen motion timelines.

---

## 5. Pre-Ship GSAP Quality Checklist

- [ ] Is GSAP genuinely justified by complex multi-step choreography or scroll-scrubbing?
- [ ] Are all animations cleanly scoped within `gsap.context()` and reverted on unmount?
- [ ] Are all tweens strictly animating CSS transforms and opacity?
- [ ] Is `prefers-reduced-motion` honored with immediate final-state rendering?
- [ ] Does the page scroll smoothly without stuttering or layout reflows on mobile devices?
