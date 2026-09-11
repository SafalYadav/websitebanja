---
name: websitebanja-spatial-interaction
description: 3D and spatial scroll interaction intelligence, multi-plane CSS depth, camera perspective, docking, mobile 2.5D fallbacks, and performance budgets.
version: 1.0.0
---

# WebsiteBanja AI — 3D & Spatial Scroll Interaction Intelligence Skill

> **Role**: Spatial Web Choreography, CSS 3D Multi-Plane Geometry, Perspective & Depth Hierarchy, and Hardware-Budgeted Scroll Interaction Engine.  
> **Source**: Lessons learned from the WebsiteBanja 3D Workbench experiment, CSS 3D Transform specification (\`perspective\`, \`transform-style: preserve-3d\`, \`translateZ\`, \`rotateX/Y\`), native hardware compositing, and Core Web Vitals safety.  
> **Application Priority**: User Explicit Requirements > Usability & Device Ergonomics > Reduced-Motion Accessibility > Spatial Clarity > Visual Novelty.

---

## 1. Core Spatial Philosophy: Purpose-Driven Depth

3D and spatial interaction on the web must communicate **physical tangible reality, architectural presence, or technical sophistication**. It must **never** be used as decorative clutter that causes scroll jank, drains mobile batteries, or obscures reading flow.

### The 4 Spatial Elegance Principles
1. **Lightweight CSS 3D First**: Always prioritize CSS 3D transforms (\`perspective\`, \`preserve-3d\`, \`translateZ\`, \`rotateX\`, \`rotateY\`, \`scale\`) over heavy WebGL/Three.js bundles. CSS transforms run directly on the GPU compositor thread without blocking the JavaScript main thread.
2. **Section-Specific Isolation**: Never apply 3D to an entire generated website. Isolate spatial depth to a single, high-value hero or showcase section where it provides maximum storytelling impact.
3. **Scroll-Driven Physics with Docking**: Spatial elements should transition smoothly with user scroll and settle into an ergonomic flat reading state as the user enters reading zones.
4. **Mobile Graceful Fallback**: Desktops support rich CSS 3D depth; tablets reduce angular deflection; mobile screens (<768px) automatically drop to 2.5D elevation or flat layouts to preserve native thumb scrolling.

---

## 2. 3D Eligibility Decision Engine

WebsiteBanja evaluates every website requirement against the **Spatial Suitability Matrix**:

```
┌──────────────────────────┬──────────────────────┬──────────────────────────────────────────┐
│ Industry / Category      │ Default Level        │ Primary Rationale                        │
├──────────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ SaaS / AI Platforms      │ ADVANCED_CSS_3D      │ Product interface depth, layers & scale  │
│ Architecture Studios     │ ADVANCED_CSS_3D      │ Volumetric space, structural facades     │
│ Creative / Design Agency │ ADVANCED_CSS_3D      │ Spatial portfolio cards, creative voice  │
│ Luxury DTC / High-End    │ SUBTLE_2_5D          │ Tactile specular surfaces, gentle tilt   │
│ Automotive / Industrial  │ ADVANCED_CSS_3D      │ Vehicle reveal, hardware inspection      │
│ Consumer Electronics     │ ADVANCED_CSS_3D      │ Precision hardware layers & exploded view│
├──────────────────────────┼──────────────────────┼──────────────────────────────────────────┤
│ Dental & Medical Clinics │ NONE                 │ Clinical hygiene, clarity, high trust    │
│ Emergency Trades / Plumb │ NONE                 │ Immediate phone CTA, zero distraction    │
│ Legal / Financial Trust  │ NONE                 │ Serious institutional credibility        │
│ Dense E-commerce Catalog │ NONE / SUBTLE_2_5D   │ High scan speed, zero layout shift (CLS) │
│ Bakeries / Local Cafes   │ NONE                 │ Warm human connection, food photography  │
└──────────────────────────┴──────────────────────┴──────────────────────────────────────────┘
```

> **CRITICAL OVERRIDE RULE**:
> If the user explicitly asks for 3D/animation (e.g., "give it 3D effects", "interactive 3D hero"), elevate eligibility to \`ADVANCED_CSS_3D\` regardless of industry.
> If the user explicitly asks for "minimal", "static", or "no animation", set eligibility to \`NONE\`.

---

## 3. Spatial Depth Levels & Parameters

### Level 1: \`NONE\`
- Standard 2D DOM layout. Zero perspective, zero rotation.
- Best for medical, legal, emergency services, and performance-critical landing pages.

### Level 2: \`SUBTLE_2_5D\`
- **Perspective**: \`1400px\`
- **Max Rotation**: \`rotateX(4deg) rotateY(-3deg)\`
- **Z-Elevation**: \`translateZ(12px)\`
- **Motion**: Subtle cursor tilt or gentle scroll-linked depth shift.
- Best for luxury fashion, boutique products, and high-end hospitality.

### Level 3: \`ADVANCED_CSS_3D\`
- **Perspective**: \`1200px\`
- **Transform Style**: \`preserve-3d\`
- **Max Rotation**: \`rotateX(12deg) rotateY(-8deg) rotateZ(1.5deg)\`
- **Z-Separation**: Multi-plane stack:
  - Background surface: \`translateZ(0px)\`
  - Middle visual frame: \`translateZ(24px)\`
  - Floating UI chips / badges: \`translateZ(48px)\`
- **Specular Edge**: \`inset 0 1px 0 rgba(255,255,255,0.18)\` highlight on active angle.
- Best for SaaS product interfaces, architecture hero reveals, and creative studios.

### Level 4: \`RICH_SPATIAL\`
- Reserved for explicit high-tier showcase requirements where canvas WebGL shaders or multi-angle orbital inspection are requested. Must include pre-warmed lazy loading and low-VRAM budgets.

---

## 4. Mobile & Accessibility Guardrails

### A. Viewport Ergonomics
- On screens narrower than \`768px\` (\`md\` breakpoint):
  - Disable multi-axis rotation (\`rotateX(0deg)\`, \`rotateY(0deg)\`).
  - Flatten \`translateZ\` to standard CSS box-shadow elevation.
  - Maintain fluid vertical touch scroll with zero gesture hijacking.

### B. Accessibility (\`prefers-reduced-motion\`)
- When \`@media (prefers-reduced-motion: reduce)\` is active:
  - Zero rotation or perspective transforms.
  - Settle all elements immediately into their resting docked state.
  - Preserve visual design beauty through typography, colors, and subtle border highlights.

### C. Performance Budget
- Total CSS 3D transformed elements per section: **<= 8 DOM nodes**.
- Hardware acceleration: Apply \`will-change: transform\` only during active scroll/interaction and clear it when idle.
- GPU Compositing: Use only \`transform\` and \`opacity\`. Never animate \`top\`, \`left\`, \`margin\`, or \`box-shadow\` directly.
