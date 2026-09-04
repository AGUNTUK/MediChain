# Design & 3D Engineering Skills Guide: Stitch, Three.js / WebGL, R3F / Spline, Nano Banana 3D & Framer Motion

This permanent guide documents the core design systems, 3D graphics pipelines, asset integration recipes, and motion animation standards established for the MediChain B2B Pharmacy application. Use this reference for all future UI, UX, and 3D visual feature implementations.

---

## 1. Google Stitch Design System Integration

### Overview & Architecture
Google Stitch design patterns structure AI-native, high-efficiency user interfaces with clear typographic hierarchies, balanced whitespace, and purposeful micro-interactions.

### Design Tokens (`/src/lib/stitchDesignTokens.ts`)
* **Primary Palette**:
  - `primary`: `#6344E7` (MediChain Orchid Purple - authority, trust, primary branding)
  - `accent`: `#70C016` (MediChain Fresh Lime - positive actions, scan CTAs, savings badges)
  - `neutralCanvas`: `#FFFFFF` / `#FAF8FF` (Crisp, high-contrast light backgrounds)
  - `textPrimary`: `#0F172A` (Slate 900 for WCAG AA readability)
  - `textSecondary`: `#64748B` (Slate 500 for secondary descriptions)
* **Elevation & Border Strategy**:
  - `flat`: Subtle 1px borders (`border-slate-200/80`) on pristine white cards.
  - `floating`: Soft backdrop blur (`backdrop-blur-md bg-white/95`) with diffused shadow for floating badges.
  - `accentPill`: High-contrast lime buttons (`bg-[#70C016]`) with 2x horizontal padding over vertical padding (`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl`).

### Micro-Interaction Principles
* Always provide tactile active states (`active:scale-[0.98]` or `active:scale-95`).
* Maintain smooth icon translations on hover (e.g. `group-hover:translate-x-0.5`).
* Never use raw gray text on colored containers.

---

## 2. Three.js / WebGL & React Three Fiber (R3F) / Spline Pipeline

### Installed Dependencies
* `three` & `@types/three`: Low-level WebGL scene graph, geometry, and physically based rendering.
* `@react-three/fiber`: React 19-compatible declarative Three.js renderer.
* `@react-three/drei`: Useful camera helpers, environment maps, and shader utilities.
* `@splinetool/react-spline` & `@splinetool/runtime`: High-fidelity Spline 3D web runtime.

### Recommended WebGL Setup & Best Practices
```tsx
import * as THREE from "three";

// 1. Renderer Initialization with ACES Filmic Tone Mapping & DPR Capping
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// 2. Responsive Canvas Handling via ResizeObserver
const resizeObserver = new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect;
  if (width > 0 && height > 0) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
});

// 3. Proper Cleanup on Unmount
// Always cancelAnimationFrame, disconnect observer, remove DOM canvas, and call renderer.dispose().
```

### Spline Integration Pattern
```tsx
import Spline from '@splinetool/react-spline';

export function InteractiveSplineBanner() {
  return (
    <div className="w-full h-[280px] rounded-3xl overflow-hidden">
      <Spline scene="https://prod.spline.design/YOUR_SCENE_ID/scene.splinecode" />
    </div>
  );
}
```

---

## 3. Nano Banana 3D Asset Integration

### Concept & Aesthetic Definition
"Nano Banana" styling refers to studio-grade, photorealistic 3D collectible assets and isometric scenes (popularized by Google DeepMind Gemini & Imagen visual generation workflows):
* **Studio 3-Point Lighting**:
  - **Key Light**: Warm softbox (`0xfff8ee`, intensity `2.2`) placed at `(4, 6, 5)`.
  - **Fill Light**: Cool lavender fill (`0xede9fe`, intensity `1.2`) at `(-5, -2, 3)`.
  - **Rim / Edge Light**: High-contrast brand lime accent (`0x70c016`, intensity `1.6`) at `(0, 5, -6)` to separate meshes from the background.
* **Material Shaders**:
  - High clearcoat gloss (`clearcoat: 0.9`, `clearcoatRoughness: 0.1`) on pharmaceutical capsules.
  - Satin finish (`roughness: 0.2`, `metalness: 0.02`) on white tablet bases.
  - Soft ambient ground shadows (`ellipse` with `blur(8px)` and indigo opacity).

### Procedural Asset Generator (`/src/lib/nanoBananaAssets.ts`)
* `createNanoBananaCapsuleMesh()`: Builds a dual-color 3D capsule with center seam accent.
* `setupNanoBananaStudioLights()`: Injects calibrated key, fill, and rim lights into any Three.js scene.
* `ThreeDMedicineViewer.tsx`: Self-contained interactive 3D WebGL viewer supporting user touch/pointer rotation, auto-rotation, and reset controls.

---

## 4. Framer Motion (`framer-motion` & `motion/react`)

### Motion Presets
* **Spring Transitions**:
  ```ts
  const springBouncy = { type: "spring", stiffness: 400, damping: 25 };
  const springGentle = { type: "spring", stiffness: 260, damping: 20 };
  ```
* **Seamless Mode Toggling**:
  Use `<AnimatePresence mode="wait">` to transition between 2D vector illustrations and interactive 3D WebGL canvases:
  ```tsx
  <AnimatePresence mode="wait">
    {is3D ? (
      <motion.div
        key="3d"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        <ThreeDMedicineViewer />
      </motion.div>
    ) : (
      <motion.div key="2d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {/* 2D Vector Illustration */}
      </motion.div>
    )}
  </AnimatePresence>
  ```

### Accessibility & Reduced Motion
* Always respect `prefers-reduced-motion` using `useReducedMotion()` from `motion/react` or `framer-motion`.
* Disable auto-spinning loops or slide transforms when reduced motion is preferred.

---

## 5. Implementation Checklist for New 3D / UI Features

1. **Tokens**: Import colors, typography, and elevations from `/src/lib/stitchDesignTokens.ts`.
2. **Icons**: Use `lucide-react` for all iconography with consistent stroke widths (`stroke-[2]` to `stroke-[2.4]`).
3. **WebGL Performance**: Cap pixel ratio at `2.0` to preserve mobile battery and frame rates.
4. **Fallback Handling**: Always provide a graceful 2D vector/illustration fallback if WebGL is unavailable or unaccelerated.
5. **Project Context**: Record any architectural updates in `DEVELOPER_HANDOVER_REPORT.md`.
