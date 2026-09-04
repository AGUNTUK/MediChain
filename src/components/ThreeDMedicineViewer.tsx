import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, Sparkles, Box, SunMedium, Move3d } from "lucide-react";
import { createNanoBananaCapsuleMesh, setupNanoBananaStudioLights } from "../lib/nanoBananaAssets";
import StitchDesignTokens from "../lib/stitchDesignTokens";

interface ThreeDMedicineViewerProps {
  className?: string;
  autoRotateDefault?: boolean;
  interactive?: boolean;
  showControls?: boolean;
}

export default function ThreeDMedicineViewer({
  className = "w-full h-[220px] sm:h-[260px]",
  autoRotateDefault = true,
  interactive = true,
  showControls = true,
}: ThreeDMedicineViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotateDefault);
  const [isHovered, setIsHovered] = useState(false);
  const [lightingMode, setLightingMode] = useState<"studio" | "vibrant">("studio");
  const [webglSupported, setWebglSupported] = useState(true);

  // Three.js instances ref
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 240;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Lights
    setupNanoBananaStudioLights(scene);

    // Mesh
    const capsuleMesh = createNanoBananaCapsuleMesh();
    capsuleMesh.scale.set(1.2, 1.2, 1.2);
    meshGroupRef.current = capsuleMesh;
    scene.add(capsuleMesh);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (capsuleMesh && isAutoRotating && !isDraggingRef.current) {
        capsuleMesh.rotation.y += delta * 0.8;
        capsuleMesh.position.y = Math.sin(clock.getElapsedTime() * 1.5) * 0.12;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !rendererRef.current) return;
      const { width: newW, height: newH } = entries[0].contentRect;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    prevPointerRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interactive || !isDraggingRef.current || !meshGroupRef.current) return;
    const deltaX = e.clientX - prevPointerRef.current.x;
    const deltaY = e.clientY - prevPointerRef.current.y;

    meshGroupRef.current.rotation.y += deltaX * 0.012;
    meshGroupRef.current.rotation.x += deltaY * 0.012;

    prevPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!interactive) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const resetRotation = () => {
    if (!meshGroupRef.current) return;
    meshGroupRef.current.rotation.set(Math.PI / 8, 0, Math.PI / 6);
  };

  return (
    <div 
      className={`relative flex items-center justify-center select-none overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D WebGL Canvas Container */}
      {webglSupported ? (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
        />
      ) : (
        /* Fallback if WebGL disabled */
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <Box className="w-10 h-10 text-[#6344E7] mb-2" />
          <p className="text-xs font-bold text-slate-700">WebGL 3D Accelerated</p>
        </div>
      )}

      {/* Floating Nano Banana Asset Tag */}
      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-md border border-purple-100 shadow-xs text-[10px] font-bold text-[#6344E7]">
          <Sparkles className="w-3 h-3 text-[#70C016]" />
          <span>Nano Banana 3D</span>
        </div>
      </div>

      {/* Interactive 3D Control Badges */}
      {showControls && (
        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-xs">
          <button
            type="button"
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            title={isAutoRotating ? "Pause 3D rotation" : "Start 3D rotation"}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isAutoRotating ? "bg-purple-100 text-[#6344E7]" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAutoRotating ? "animate-spin" : ""}`} style={{ animationDuration: "6s" }} />
          </button>
          
          <button
            type="button"
            onClick={resetRotation}
            title="Reset 3D pose"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Move3d className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
