---
name: websitebanja-threejs
description: 3D WebGL environments, particle shaders, interactive canvas viewports, and performance-budgeted 3D product showcases.
version: 1.0.0
---

# WebsiteBanja AI — Three.js & 3D Web Experience Intelligence Skill

> **Role**: Spatial Web Architecture, WebGL 3D Visualization, Real-Time Physics Shaders, and Hardware-Budgeted 3D Engineering.  
> **Source**: Three.js / React Three Fiber (R3F) runtime architecture, WebGL 2.0 pipeline standards, glTF 2.0 PBR material models, and mobile GPU performance benchmarks.  
> **Application Priority**: Hardware Performance Budget & Mobile Battery > Spatial Relevance to Product > Visual Immersion > Novelty.

---

## 1. Core Philosophy: Purposeful Spatial Depth

3D on the web is an extraordinary storytelling tool when it communicates tactile physical reality (a 360° architectural model, an interactive hardware inspection, or a spatial data topology). It is an absolute disaster when it burns laptop batteries, triggers jet-engine fans, and adds 8MB of bloated assets to a simple business landing page.

WebsiteBanja AI treats 3D as a **high-value progressive enhancement** governed by strict hardware performance budgets.

---

## 2. When to Use vs. When NOT to Use 3D

### Justified Use Cases
- **Hardware & Physical Product Showcases**: 360-degree interactive camera orbit of a luxury watch, consumer electronics device, or automotive model.
- **Architectural & Real Estate Previews**: Walkable floor plans or exterior architectural scale models.
- **Futuristic / Web3 / Creative Agency Hero**: An abstract, responsive mathematical mesh that reacts smoothly to cursor position.

### Strictly Forbidden Use Cases
- Standard local service businesses (Plumbers, Dentists, Bakeries).
- High-frequency data dashboards or text-heavy reading blogs.
- Budget mobile connections or low-battery mobile devices.
- Any project where the user explicitly requested "fast", "minimal", or "static".

---

## 3. Hardware Performance Budgets & Strict Thresholds

To guarantee steady 60fps on consumer devices:
| Technical Metric | Desktop Target | Mobile Budget | Hard Ceiling (Danger Zone) |
| :--- | :--- | :--- | :--- |
| **Draw Calls per Frame** | `< 40` | `< 15` | `> 80` (Guaranteed frame drops) |
| **Total Scene Vertices** | `< 45,000` | `< 15,000` | `> 100,000` (Mobile GPU stall) |
| **Texture File Weight** | `< 1.5 MB total` | `< 500 KB total` | `> 5.0 MB` (Severe mobile lag) |
| **Memory Footprint** | `< 60 MB VRAM` | `< 25 MB VRAM` | `> 120 MB` (Mobile browser tab crash) |

---

## 4. Architectural Patterns for Safe WebGL Integration

### A. Dynamic Lazy Loading (SSR Isolation)
Three.js requires direct access to browser `window` and `WebGLRenderingContext`. It must never execute during Next.js server-side rendering:
```tsx
import dynamic from "next/dynamic";

const Product3DCanvas = dynamic(() => import("@/components/3d/ProductCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] bg-gradient-to-b from-muted/30 to-muted/10 rounded-2xl animate-pulse flex items-center justify-center">
      <span className="text-xs text-muted-foreground font-mono">Loading 3D Engine...</span>
    </div>
  ),
});
```

### B. Mobile Fallback Strategy
On screen widths `< 768px` or low-end mobile devices, bypass the WebGL context entirely and serve a pre-rendered, high-fidelity WebP poster image or video loop:
```tsx
const isMobile = useMediaQuery("(max-width: 768px)");
if (isMobile) {
  return <img src="/product-3d-poster.webp" className="w-full h-auto object-contain" alt="3D Product Render" />;
}
```

### C. Offscreen & Background Tab Throttling
Never let the WebGL rendering loop burn GPU cycles when the canvas is hidden:
```javascript
// Pause requestAnimationFrame loop on document tab change
const handleVisibilityChange = () => {
  if (document.hidden) {
    renderer.setAnimationLoop(null);
  } else {
    renderer.setAnimationLoop(renderScene);
  }
};
document.addEventListener("visibilitychange", handleVisibilityChange);

// Pause when scrolled out of viewport
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) {
    renderer.setAnimationLoop(renderScene);
  } else {
    renderer.setAnimationLoop(null);
  }
});
observer.observe(renderer.domElement);
```

### D. Reduced Motion Fallback
When `prefers-reduced-motion: reduce` matches, lock the camera position, disable particle turbulence, and render a static three-dimensional angle without continuous rotation.

---

## 5. Critical Three.js Anti-Patterns

1. **The Unoptimized 30MB glTF File**: Dropping raw CAD exports with 2 million polygons directly into a web project. Always Draco-compress models (`gltf-pipeline`).
2. **Infinite Background GPU Draining**: Running continuous Three.js particle loops in the background when the user has scrolled 3 pages down.
3. **Trapping Page Scroll in 3D Canvas**: Placing full-screen `OrbitControls` that intercept vertical mouse wheel events, preventing the user from scrolling down the page. Always disable wheel scroll on canvas unless explicitly focused.
4. **Mobile Meltdown**: Forcing complex real-time shadow maps (`CastShadow / ReceiveShadow`) across 5 point lights on a smartphone.

---

## 6. Pre-Ship Three.js Quality Checklist

- [ ] Is the 3D scene loaded asynchronously via dynamic client import?
- [ ] Does total scene polygon count stay strictly under 50,000 vertices?
- [ ] Is the render loop automatically paused when offscreen or in a hidden tab?
- [ ] Does mobile view have a lightweight poster fallback or simplified low-poly geometry?
- [ ] Does the canvas allow normal vertical touch and mouse wheel scrolling without hijacking the page?
- [ ] Does the scene honor `prefers-reduced-motion` with static camera placement?
