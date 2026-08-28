import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCartFeedback } from "../context/FlyToCartContext";

const PARTICLE_COUNT = 8;

function Particle({ origin, index }: { origin: { x: number; y: number }; index: number }) {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
  const distance = 28 + Math.random() * 18;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance - 10;

  return (
    <motion.div
      key={index}
      initial={{ x: origin.x, y: origin.y, scale: 1, opacity: 1 }}
      animate={{
        x: origin.x + x,
        y: origin.y + y,
        scale: 0,
        opacity: 0
      }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="fixed top-0 left-0 z-50 pointer-events-none w-2 h-2 rounded-full bg-brand-lime shadow-[0_0_8px_rgba(132,204,22,0.8)]"
    />
  );
}

export default function CartBurst() {
  const { burstOrigin } = useCartFeedback();

  return (
    <AnimatePresence>
      {burstOrigin && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <Particle index={i} origin={burstOrigin!} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
