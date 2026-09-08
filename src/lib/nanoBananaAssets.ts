/**
 * Nano Banana 3D Asset Integration & Model System
 * 
 * Nano Banana represents the studio-grade, photorealistic 3D collectible styling:
 * - Soft 3-point studio lighting (Key, Fill, Rim)
 * - Matte & glossy subsurface shaders (pharmaceutical gelatin capsule, frosted amber glass, silver foil)
 * - High-end isometric framing with gentle ambient occlusion
 * - Interactive WebGL 3D meshes using Three.js & React Three Fiber (R3F)
 */

import * as THREE from "three";

export interface NanoBananaAssetMeta {
  id: string;
  name: string;
  category: "capsule" | "bottle" | "blister" | "box" | "device";
  description: string;
  lightingPreset: "studio-soft" | "pharmacy-clean" | "vibrant-neon";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export const NANO_BANANA_PRESETS: Record<string, NanoBananaAssetMeta> = {
  medichainCapsule: {
    id: "medichain-capsule-3d",
    name: "MediChain Two-Tone Smart Capsule",
    category: "capsule",
    description: "Photorealistic 3D gelatin capsule with half orchid purple gloss, half pure white satin, and interior micro-beads.",
    lightingPreset: "studio-soft",
    primaryColor: "#6344E7",
    secondaryColor: "#FFFFFF",
    accentColor: "#70C016"
  },
  syrupBottle: {
    id: "syrup-bottle-3d",
    name: "Amber Glass Pharmaceutical Bottle",
    category: "bottle",
    description: "3D amber glass bottle with ribbed child-resistant purple cap and DGDA compliance hologram label.",
    lightingPreset: "pharmacy-clean",
    primaryColor: "#D97706",
    secondaryColor: "#6344E7",
    accentColor: "#10B981"
  },
  blisterPack: {
    id: "blister-pack-3d",
    name: "Alu-Alu Silver Foil Blister Strip",
    category: "blister",
    description: "Metallic silver blister sheet with 10 scored tablets and tactile foil embossing.",
    lightingPreset: "studio-soft",
    primaryColor: "#E2E8F0",
    secondaryColor: "#94A3B8",
    accentColor: "#6344E7"
  }
};

/**
 * Procedural Three.js 3D Capsule Generator (Nano Banana Collectible Style)
 * Builds a two-tone 3D medicine capsule with smooth bevels and studio-lit materials.
 */
export function createNanoBananaCapsuleMesh(): THREE.Group {
  const group = new THREE.Group();

  // Top half: Orchid Purple (#6344E7)
  const topGeo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const cylTopGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);
  
  const purpleMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#6344E7"),
    roughness: 0.15,
    metalness: 0.05,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    reflectivity: 0.8,
  });

  const topDome = new THREE.Mesh(topGeo, purpleMat);
  topDome.position.y = 1;
  const topCyl = new THREE.Mesh(cylTopGeo, purpleMat);
  topCyl.position.y = 0.5;

  const topGroup = new THREE.Group();
  topGroup.add(topDome);
  topGroup.add(topCyl);

  // Bottom half: Pure Satin White (#FFFFFF)
  const botGeo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const cylBotGeo = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true);

  const whiteMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#F8FAFC"),
    roughness: 0.2,
    metalness: 0.02,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
  });

  const botDome = new THREE.Mesh(botGeo, whiteMat);
  botDome.position.y = -1;
  const botCyl = new THREE.Mesh(cylBotGeo, whiteMat);
  botCyl.position.y = -0.5;

  const botGroup = new THREE.Group();
  botGroup.add(botDome);
  botGroup.add(botCyl);

  // Center seam ring
  const ringGeo = new THREE.TorusGeometry(1.01, 0.03, 16, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#70C016"), // Brand lime seam accent
    roughness: 0.3,
    metalness: 0.2
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;

  group.add(topGroup);
  group.add(botGroup);
  group.add(ring);

  // Default tilt for photogenic 3D showcase
  group.rotation.z = Math.PI / 6;
  group.rotation.x = Math.PI / 8;

  return group;
}

/**
 * Configure Studio 3-Point Lighting for Nano Banana WebGL Scenes
 */
export function setupNanoBananaStudioLights(scene: THREE.Scene): void {
  // Ambient soft base
  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);

  // Key Light (warm studio softbox)
  const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  // Fill Light (cool lavender fill)
  const fillLight = new THREE.DirectionalLight(0xede9fe, 1.2);
  fillLight.position.set(-5, -2, 3);
  scene.add(fillLight);

  // Rim / Backlight (vibrant lime edge glow)
  const rimLight = new THREE.DirectionalLight(0x70c016, 1.6);
  rimLight.position.set(0, 5, -6);
  scene.add(rimLight);
}
