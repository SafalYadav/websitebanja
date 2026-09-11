---
name: websitebanja-framer-motion
description: Production-ready Framer Motion choreography, spring physics (400/30), reduced motion support, and micro-interactions.
version: 1.0.0
---

# WebsiteBanja AI — Framer Motion Design Intelligence Skill

> **Role**: Authoritative Motion Design Intelligence, Physics Systems, and Interaction Choreography Engine for WebsiteBanja AI.  
> **Source**: Derived from the upstream Framer Motion / Motion runtime architecture, spring physics mechanics, gesture responders, and production-proven motion design principles.  
> **Application Priority**: User Explicit Requirements > Usability & Reduced-Motion Accessibility > Spatial Continuity & Hierarchy > Aesthetic Polish.

---

## 1. Motion Philosophy: Purpose-Driven Motion

Animation in WebsiteBanja websites is never decorative fluff. Every pixel transition must serve an explicit cognitive or functional purpose.

### The 7 Pillars of Functional Motion
1. **Hierarchy & Attention Guidance**: Motion directs the eye to the single most important change on the screen (e.g., revealing a primary CTA, highlighting a changed plan price).
2. **Spatial Continuity & Context**: When an element transforms (e.g., an accordion opens, a tab changes, a card expands into a modal), motion connects the initial and final states so the user never experiences cognitive dislocation.
3. **Tactile Feedback & Responsiveness**: Immediate visual confirmation of user input (<100ms response to hover, tap, drag, or focus) builds confidence and perceived speed.
4. **Orientation & Mental Modeling**: Navigational transitions (swiping between mobile views, paging carousels) preserve spatial directionality (e.g., moving forward pushes content from the right; moving back pushes from the left).
5. **Progressive Disclosure & Storytelling**: Orchestrated entrances introduce complex interfaces one chunk at a time, lowering initial cognitive overload.
6. **Perceived Performance & Wait Reduction**: Smooth skeleton shimmers and orchestrated loading states make wait times feel 30–40% shorter than static spinners.
7. **Brand Voice & Emotional Polish**: The velocity, damping, and rhythm of an interface convey brand personality: snappy and precise for developer tools, smooth and weighted for luxury hospitality, energetic and bouncy for consumer social apps.

### When NOT to Animate (Strict Guardrails)
- **Content Consumption**: Never animate body text or article prose while the user is actively reading.
- **High-Frequency Actions**: Never add delay or slow animations to frequent, repetitive actions (e.g., typing in form inputs, navigating table pagination, closing alerts).
- **Critical Error Alerts**: Security warnings, validation failures, and urgent status alerts must appear instantly; never delay critical information behind a fade.
- **Constrained Hardware / Low Battery**: On budget mobile devices, heavy motion degrades frame rates into stuttering jank.

---

## 2. Motion Hierarchy & Spatial Orchestration

Motion must respect the same hierarchy as typography and layout. If every element moves at the same intensity, the interface becomes chaotic visual noise.

```
┌─────────────────────────────────────────────────────────┐
│ Level 1: Macro / Page Orchestration (350–500ms)         │
│ Hero reveals, route transitions, modal backdrops        │
├─────────────────────────────────────────────────────────┤
│ Level 2: Component Structure (200–350ms)                │
│ Cards expanding, accordions opening, tab pills sliding  │
├─────────────────────────────────────────────────────────┤
│ Level 3: Micro-Interactions (100–180ms)                 │
│ Button hover, icon press, toggle flip, tooltip appear   │
└─────────────────────────────────────────────────────────┘
```

### Staggered Entrance Rules
- **Parent-to-Child Stagger**: Stagger child elements by **0.04s to 0.08s** per item.
- **Maximum Stagger Cap**: Never stagger more than **6 to 8 items**. For lists or grids with 10+ items, animate only the first 6 sequentially and reveal the remainder as a single grouped fade, avoiding a tedious 2-second wait.
- **Directional Cohesion**: Animate elements entering from the direction they naturally emerge (e.g., dropdowns move down from the trigger; side sheets slide in from the screen edge).

---

## 3. Physics vs. Timing: Springs vs. Tweens

Modern interfaces feel natural when they obey physical laws rather than linear clocks.

### A. Spring Physics (Preferred for Interactive Elements)
Springs simulate physical mass, tension, and friction. They dynamically absorb interruptive user gestures (e.g., tapping a button while it is still hovering) without abrupt visual snapping.

| Use Case | Stiffness | Damping | Mass | Visual Characteristic |
| :--- | :--- | :--- | :--- | :--- |
| **Snappy Micro-Feedback** (Buttons, Toggles, Badges) | `400–500` | `28–35` | `0.8` | Instantaneous, crisp, zero visible overshoot |
| **Balanced Structural** (Cards, Dialogs, Sidebars) | `260–320` | `22–26` | `1.0` | Natural weight, fluid settle, premium feel |
| **Gentle Fluid** (Modals, Large Drawers, Floating Menus) | `160–200` | `20–24` | `1.2` | Soft, elegant, deliberate deceleration |
| **Playful Accent** (Notifications, Success Badges) | `300` | `18` | `1.0` | Controlled, subtle bounce (<5% overshoot) |

### B. Easing Curves (Tweens — When Exact Duration is Required)
When orchestrating time-deterministic sequences (e.g., page exits, synchronized carousels, progress bars):
- **Entrance Easing**: Cubic-bezier `[0.16, 1, 0.3, 1]` (Out-Expo). Fast initial acceleration with an ultra-smooth, long landing curve.
- **Exit Easing**: Cubic-bezier `[0.7, 0, 0.84, 0]` (In-Expo) or `[0.4, 0, 1, 1]`. Elements leave quickly without lingering.
- **Symmetric Transitions**: Cubic-bezier `[0.4, 0, 0.2, 1]` (Standard Ease-In-Out) for loopable or reversible continuous states.

### C. The Asymmetric Exit Rule
> **Rule**: An exit transition must resolve **30% to 40% faster** than the corresponding entrance transition.
- If a dialog enters over `300ms`, it must exit in `180ms–200ms`.
- Users want confirmation that an action is dismissing immediately; lingering exit animations create friction and perceived lag.

---

## 4. Core Framer Motion Primitives & Architecture

### A. Motion Components & Props
Framer Motion wraps standard DOM elements into reactive hardware-accelerated nodes:
```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -12 }}
  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
/>
```

### B. The Variants Pattern (Mandatory for Clean Code)
Avoid inlining animation objects inside JSX. Extract variants to create declarative, testable, and reusable motion definitions:
```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 24,
    },
  },
};
```

### C. AnimatePresence & Unmounting Lifecycle
Use `<AnimatePresence>` to safely orchestrate unmounting elements (modals, toasts, dropdowns, tab panels):
- **`mode="wait"`**: Guarantees the exiting component completely finishes its exit transition before the new component mounts. Crucial for page transitions and tab panels to prevent layout collision.
- **`mode="popLayout"`**: Enables exiting elements to pop out of the DOM layout flow (`position: absolute` internally applied during exit) so entering elements smoothly fill the space.
- **`initial={false}`**: Prevents initial mount animations on first page load when server-rendering already displays content.

---

## 5. Layout Transitions & Shared Layout Morphing

### A. The `layout` Prop & FLIP Technique
Adding `layout` to `<motion.div>` instructs Framer Motion to automatically calculate the bounding box delta via the FLIP (First, Last, Invert, Play) technique when DOM layout shifts:
- Smooth grid reordering when filters change.
- Fluid container height adjustment when items expand.
- **Preventing Distortion**: When animating layout on containers with rounded corners or borders, always supply `borderRadius` or `overflow: hidden` as motion values to avoid rectangular warping during scale inversion.

### B. Shared Layout (`layoutId`)
The `layoutId` prop links two distinct components across separate branches of the React tree, morphing one into the other seamlessly.
- **Active Tab Pill Indicator**: Place `<motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-primary rounded-full -z-10" />` inside the active tab. As the user clicks across tabs, the pill glides smoothly without manual coordinate math.
- **Card-to-Modal Expansion**: Clicking a preview card expands its container into a full-screen modal with matching `layoutId`.

---

## 6. Reactive Motion Values & Scroll Intelligence

### A. Non-Rendering Motion Values
`useMotionValue` and `useTransform` bypass React component render loops entirely, modifying style attributes directly on the compositor thread:
```tsx
const x = useMotionValue(0);
const opacity = useTransform(x, [-150, 0, 150], [0, 1, 0]);
```

### B. Scroll-Driven Animations
1. **`useScroll`**:
   - Page scroll progress: `const { scrollYProgress } = useScroll();`
   - Target container scroll progress: `const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });`
2. **`useInView` & `whileInView`**:
   - Trigger viewport entrances when elements enter the screen:
     ```tsx
     <motion.div
       initial={{ opacity: 0, y: 24 }}
       whileInView={{ opacity: 1, y: 0 }}
       viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
       transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
     />
     ```
   - **`once: true`**: Always use `once: true` for reading content and marketing sections. Re-animating content every time a user scrolls up and down causes severe visual annoyance.
   - **`margin` Trigger Offset**: Use a negative margin (e.g. `-10%` or `-50px`) so content reveals only after it has cleanly entered the viewport, not right at the extreme boundary pixel.

### C. Parallax Scroll Rules
- **Layer Speed Ratios**: Background elements should translate at `0.1x–0.2x` scroll velocity; never exceed `0.3x`.
- **Restricted Targets**: Parallax is strictly restricted to atmospheric glows, decorative background shapes, and ambient imagery.
- **Never Parallax Readable Text**: Body copy and primary conversion CTAs must move at native 1:1 scroll speed to preserve legibility and prevent motion sickness.

---

## 7. Gesture Design & Micro-Interactions

### A. WhileHover, WhileTap, and WhileFocus
Framer Motion makes gesture binding declarative and rock-solid:
```tsx
<motion.button
  whileHover={{ scale: 1.02, y: -1 }}
  whileTap={{ scale: 0.98, y: 1 }}
  whileFocus={{ ring: 2 }}
  transition={{ type: "spring", stiffness: 450, damping: 30 }}
  className="btn-primary"
>
  Get Started Free
</motion.button>
```

### B. Safe Interactive Limits
- **Hover Scale**: Clamp between `1.01` and `1.03` (maximum 3% expansion). Oversized zoom (`1.1+`) looks cartoonish and clips neighboring layout boundaries.
- **Tap Depression**: Clamp between `0.96` and `0.98`.
- **Card Hover Elevation**: Translate `y: -2px` to `-4px` combined with a soft shadow elevation. Never translate more than `6px`.

### C. Drag & Elastic Bounds
- When implementing draggable bottom sheets or reorderable lists, configure `drag="y"`, `dragConstraints={{ top: 0, bottom: 0 }}`, and `dragElastic={0.2}` to provide tactile resistance.

---

## 8. Component-Specific Motion Recipes

### 1. The Ambient Hero Reveal
Orchestrate the hero section with a coherent top-to-bottom entrance:
1. **Time 0ms**: Eyebrow badge fades and slides down (`y: -8px -> 0`).
2. **Time 80ms**: Headline reveals with crisp mask or subtle slide-up (`y: 16px -> 0`).
3. **Time 160ms**: Subtitle fades in (`opacity: 0 -> 1`).
4. **Time 240ms**: CTA button group enters with snappy scale-in (`scale: 0.95 -> 1`).
5. **Time 320ms**: Hero visual/product preview glides up into place (`y: 32px -> 0`).

### 2. Bento Grid Asymmetrical Stagger
- Apply coordinate-aware or index-based staggering to bento cards.
- Each card maintains an ambient hover highlight: mouse position tracks radial glow across the card boundary.

### 3. Accordions & Collapsibles
- Animate `height` smoothly while enforcing `overflow: hidden`:
  ```tsx
  <AnimatePresence initial={false}>
    {isOpen && (
      <motion.div
        key="content"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <div className="pt-2 pb-4 text-sm text-muted-foreground">{children}</div>
      </motion.div>
    )}
  </AnimatePresence>
  ```

### 4. Floating Navbar Scroll Elevation
- Navbar begins transparent at top of page (`scrollY < 20`).
- As user scrolls past 20px, navbar animates to `backdrop-blur-md bg-background/80 border-b shadow-sm` over `200ms`.

### 5. Animated Metric Counter
- Use `useSpring` and `useTransform` to animate numeric figures from 0 to final value when scrolled into view.
- Always apply CSS `font-variant-numeric: tabular-nums` so shifting digits do not cause horizontal layout shaking.

---

## 9. Accessibility: Reduced Motion Architecture

Every motion implementation in WebsiteBanja AI must honor user accessibility settings.

### The `useReducedMotion` Mandate
Users with vestibular disorders or motion sensitivities configure their operating systems to prefer reduced motion. Ignoring this setting causes physical nausea and vertigo.

```tsx
import { useReducedMotion } from "framer-motion";

export function AccessibleCard({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  const variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 20, // Zero translation when reduced motion is active
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.05 : 0.35,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div variants={variants} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
}
```

### Global Reduced Motion Strategy
1. **Zero Translation**: Replace all `x`, `y`, `scale`, and `rotate` transforms with pure `opacity` transitions.
2. **Instant Durations**: Set durations to `0.01s` or `0.05s`.
3. **Preserve State**: The final visual state must be 100% identical whether motion is enabled or reduced. Never hide content or break layout because reduced motion is active.

---

## 10. Performance Optimization & Mobile Rules

### The Golden Performance Rules
1. **Compositor-Only Properties**: Exclusively animate `transform` (`x`, `y`, `scale`, `rotate`) and `opacity`.
2. **Never Animate Layout Properties**: Never directly animate `width`, `height`, `margin`, `padding`, `top`, `left`, or `right` with tweens. These force continuous CPU layout reflows and cause severe frame drops. Use Framer Motion's `layout` engine (which translates via CSS transforms internally) when layout shifts are required.
3. **GPU Layer Management (`will-change`)**: Use `will-change: transform` sparingly on active moving elements. Remove `will-change` once animation completes to prevent excessive GPU VRAM consumption.
4. **Offscreen Animation Throttling**: Pause all looping animations (marquees, background glows, loading pulses) when the element is offscreen using `IntersectionObserver` or Framer Motion's `whileInView`.
5. **Mobile Viewport Optimization**: On screen widths `< 768px`, reduce translation distances by 50% (e.g., `y: 40px` becomes `y: 16px`) and eliminate complex multi-layer parallax.

---

## 11. Critical Motion Anti-Patterns

1. **The Bouncy Castle**: Applying heavy spring overshoot (`damping: 10`) to standard data tables, financial cards, or serious business copy. Keep damping `> 24`.
2. **The Stagger Crawl**: Staggering 15 items by 0.15s each, forcing the user to wait over 2.2 seconds before the final card appears.
3. **The Layout Jitter**: Animating font size or border width without fixed bounding containers, causing neighboring layout elements to jitter.
4. **The Ghost Exit**: Forgetting `<AnimatePresence>` around conditional JSX (`{isOpen && <motion.div exit={...} />}`), causing the exit animation to silently fail and snap out instantly.
5. **The Endless Spin**: Keeping ambient background gradients or infinite spinners running on inactive browser tabs. Always pause on document visibility change.
6. **Interaction Blockers**: Disabling clicks or navigation until a lengthy transition completes. User intent must always take precedence over animation completion.

---

## 12. Pre-Ship Motion Quality Checklist

Before finalizing any motion-enabled component, verify:
- [ ] **Accessibility**: Does the component respect `useReducedMotion()` and render cleanly without transforms?
- [ ] **Performance**: Are all animated attributes strictly `transform` and `opacity`?
- [ ] **Hardware Acceleration**: Does the animation maintain steady 60fps/120fps on mid-tier mobile devices?
- [ ] **Exit Speed**: Are exit transitions 30–40% faster than entrance transitions?
- [ ] **Asymmetric Easing**: Is entrance easing using fast-start/smooth-decelerate (`[0.16, 1, 0.3, 1]`)?
- [ ] **Viewport Discipline**: Do viewport entrance animations specify `viewport={{ once: true }}`?
- [ ] **Spatial Grounding**: Does the motion communicate a clear physical relationship between trigger and response?
- [ ] **Subtlety**: Does the motion feel natural and supportive, rather than flashy and distracting?
