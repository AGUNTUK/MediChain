import React from "react";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function GoodMorningHeroVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full h-full min-h-[230px] sm:min-h-[260px] md:min-h-[290px] flex items-center justify-center select-none ${className}`}>
      {/* Background Decorative Gradients, Curves & Brand Patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep Orchid Purple Radial Swirl in Top Right */}
        <div 
          className="absolute -top-10 -right-10 w-64 h-64 sm:w-84 sm:h-84 rounded-full opacity-90 blur-2xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(124, 58, 237, 0.45) 0%, rgba(99, 102, 241, 0.22) 50%, transparent 75%)"
          }}
        />

        {/* Ambient Lime Accent Glow in Bottom Right */}
        <div 
          className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full opacity-40 blur-xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(112, 192, 22, 0.5) 0%, transparent 70%)"
          }}
        />

        {/* Purple Fluid Background Wave */}
        <svg 
          className="absolute top-0 right-0 h-full w-[88%] sm:w-[78%] max-w-[500px] pointer-events-none opacity-95" 
          viewBox="0 0 500 350" 
          fill="none" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="medichainPurpleWave" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EDE8FF" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#DDD3FE" stopOpacity="0.88" />
              <stop offset="80%" stopColor="#7C3AED" stopOpacity="0.94" />
              <stop offset="100%" stopColor="#5B21B6" stopOpacity="0.98" />
            </linearGradient>
            
            {/* Pattern for Supply-Chain Dot Grid */}
            <pattern id="medichainDotGrid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="rgba(255, 255, 255, 0.38)" />
            </pattern>

            {/* Vibrant Brand Lime Gradient */}
            <linearGradient id="medichainLimeCurve" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#84CC16" />
              <stop offset="100%" stopColor="#70C016" />
            </linearGradient>
          </defs>

          {/* Flowing Lavender & Purple Wave Silhouette */}
          <path 
            d="M110,0 C210,40 245,175 175,260 C135,305 195,350 255,350 L500,350 L500,0 Z" 
            fill="url(#medichainPurpleWave)" 
          />

          {/* Dot Matrix Supply Chain Grid in Upper Right */}
          <rect x="330" y="18" width="150" height="95" fill="url(#medichainDotGrid)" opacity="0.75" />

          {/* Vibrant Lime Green Swoosh at Bottom Right */}
          <path 
            d="M250,350 C325,345 415,310 500,235 L500,350 Z" 
            fill="url(#medichainLimeCurve)" 
          />
        </svg>
      </div>

      {/* Main 3D Pharmaceutical Composition */}
      <div className="relative z-10 w-full max-w-[340px] sm:max-w-[420px] h-[220px] sm:h-[260px] md:h-[290px] flex items-center justify-center pointer-events-none">
        
        {/* Floating "Smart Procurement" Glassmorphic Disc Badge (Top Right) */}
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1 sm:top-3 right-1 sm:right-5 z-30 flex flex-col items-center justify-center text-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#6D28D9]/95 via-[#7C3AED]/90 to-[#4F46E5]/95 backdrop-blur-md border border-white/40 shadow-xl p-2 pointer-events-auto"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center mb-1">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5]" />
          </div>
          <span className="text-[8.5px] sm:text-[10px] font-extrabold text-white leading-tight tracking-tight">
            Smart Depot
          </span>
          <span className="text-[7px] sm:text-[8px] font-semibold text-[#84CC16] leading-none mt-0.5 flex items-center gap-0.5">
            99.8% On-Time
          </span>
        </motion.div>

        {/* 3D Rendered Shopping Bag with Realistic Medicines */}
        <div className="relative flex items-center justify-center w-[205px] sm:w-[245px] md:w-[265px] h-full translate-x-2 sm:translate-x-0">
          <svg 
            viewBox="0 0 260 280" 
            className="w-full h-full drop-shadow-2xl overflow-visible"
          >
            <defs>
              {/* Bag Body Gradients */}
              <linearGradient id="bagFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#F9FAFB" />
                <stop offset="100%" stopColor="#E5E7EB" />
              </linearGradient>

              <linearGradient id="bagSide" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D1D5DB" />
                <stop offset="100%" stopColor="#9CA3AF" />
              </linearGradient>

              <linearGradient id="bagInner" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6B7280" />
                <stop offset="100%" stopColor="#374151" />
              </linearGradient>

              {/* Purple Bottle Gradient */}
              <linearGradient id="purpleBottleBody" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#F3F4F6" />
                <stop offset="100%" stopColor="#D1D5DB" />
              </linearGradient>
              <linearGradient id="purpleCap" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9333EA" />
                <stop offset="50%" stopColor="#7E22CE" />
                <stop offset="100%" stopColor="#581C87" />
              </linearGradient>

              {/* Green Bottle Gradient */}
              <linearGradient id="greenBottleBody" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#84CC16" />
                <stop offset="60%" stopColor="#65A30D" />
                <stop offset="100%" stopColor="#4D7C0F" />
              </linearGradient>

              {/* Silver Blister Pack Gradient */}
              <linearGradient id="silverFoil" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F9FAFB" />
                <stop offset="35%" stopColor="#E5E7EB" />
                <stop offset="70%" stopColor="#D1D5DB" />
                <stop offset="100%" stopColor="#9CA3AF" />
              </linearGradient>

              {/* Pill Highlight */}
              <linearGradient id="whitePill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E2E8F0" />
              </linearGradient>

              {/* Ground Drop Shadow */}
              <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(30, 27, 75, 0.35)" />
                <stop offset="60%" stopColor="rgba(30, 27, 75, 0.15)" />
                <stop offset="100%" stopColor="rgba(30, 27, 75, 0)" />
              </radialGradient>
            </defs>

            {/* Ambient Ground Shadow */}
            <ellipse cx="130" cy="255" rx="90" ry="18" fill="url(#groundShadow)" />

            {/* MEDICINES PEEKING OUT OF THE BAG */}
            
            {/* 1. Purple Cap Medicine Bottle (Center-Left) */}
            <g transform="translate(60, 48) rotate(-6)">
              {/* Bottle Cap with ridges */}
              <rect x="18" y="0" width="34" height="18" rx="4" fill="url(#purpleCap)" />
              <line x1="24" y1="2" x2="24" y2="16" stroke="#C084FC" strokeWidth="1.5" />
              <line x1="30" y1="2" x2="30" y2="16" stroke="#C084FC" strokeWidth="1.5" />
              <line x1="36" y1="2" x2="36" y2="16" stroke="#C084FC" strokeWidth="1.5" />
              <line x1="42" y1="2" x2="42" y2="16" stroke="#C084FC" strokeWidth="1.5" />
              {/* Bottle Neck */}
              <rect x="22" y="17" width="26" height="8" fill="#E5E7EB" />
              {/* Bottle Body */}
              <rect x="12" y="24" width="46" height="65" rx="8" fill="url(#purpleBottleBody)" />
              {/* Bottle Label with MediChain Purple */}
              <rect x="15" y="38" width="40" height="36" rx="4" fill="#6344E7" />
              <rect x="20" y="44" width="30" height="4" rx="2" fill="#FFFFFF" />
              <rect x="20" y="52" width="20" height="3" rx="1.5" fill="#DDD6FE" />
              <rect x="20" y="59" width="14" height="3" rx="1.5" fill="#DDD6FE" />
              {/* Specular Glare */}
              <path d="M15,26 C15,26 22,30 22,85" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            </g>

            {/* 2. Silver Blister Pack of Tablets (Center-Right) */}
            <g transform="translate(112, 35) rotate(14)">
              {/* Blister Card Base */}
              <rect x="0" y="0" width="52" height="74" rx="7" fill="url(#silverFoil)" stroke="#CBD5E1" strokeWidth="1.2" />
              {/* Tablet Domes 2x3 Grid */}
              <g fill="url(#whitePill)" stroke="#94A3B8" strokeWidth="0.8">
                <circle cx="16" cy="16" r="8" />
                <circle cx="36" cy="16" r="8" />
                <circle cx="16" cy="37" r="8" />
                <circle cx="36" cy="37" r="8" />
                <circle cx="16" cy="58" r="8" />
                <circle cx="36" cy="58" r="8" />
              </g>
              {/* Specular pill glints */}
              <circle cx="14" cy="14" r="2.5" fill="#FFFFFF" opacity="0.85" />
              <circle cx="34" cy="14" r="2.5" fill="#FFFFFF" opacity="0.85" />
              <circle cx="14" cy="35" r="2.5" fill="#FFFFFF" opacity="0.85" />
              <circle cx="34" cy="35" r="2.5" fill="#FFFFFF" opacity="0.85" />
              <circle cx="14" cy="56" r="2.5" fill="#FFFFFF" opacity="0.85" />
              <circle cx="34" cy="56" r="2.5" fill="#FFFFFF" opacity="0.85" />
            </g>

            {/* 3. Green Medicine Bottle (Far Right) */}
            <g transform="translate(162, 60) rotate(18)">
              {/* Cap */}
              <rect x="10" y="0" width="22" height="15" rx="3" fill="#65A30D" />
              {/* Body */}
              <rect x="6" y="14" width="30" height="52" rx="6" fill="url(#greenBottleBody)" />
              {/* White Label */}
              <rect x="8" y="24" width="26" height="26" rx="2" fill="#FFFFFF" opacity="0.9" />
              <rect x="12" y="28" width="18" height="3" rx="1.5" fill="#15803D" />
              <rect x="12" y="34" width="12" height="2" rx="1" fill="#86EFAC" />
            </g>

            {/* THE WHITE SHOPPING BAG (Isometric Paper Bag) */}
            
            {/* Dark Inner Opening */}
            <polygon points="56,105 186,105 212,122 82,122" fill="url(#bagInner)" />

            {/* Bag Right Side Panel (Crease & 3D Depth) */}
            <polygon points="186,105 218,118 206,242 174,232" fill="url(#bagSide)" />
            {/* Center Fold Crease Line on Side Panel */}
            <line x1="202" y1="111" x2="190" y2="237" stroke="#6B7280" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

            {/* Bag Front Panel (Clean Crisp White Paper) */}
            <polygon points="56,105 186,105 174,232 44,232" fill="url(#bagFront)" stroke="#E5E7EB" strokeWidth="1.2" />

            {/* Bag Top Folded Edge Highlight */}
            <polygon points="56,103 186,103 186,108 56,108" fill="#FFFFFF" opacity="0.9" />
            
            {/* Paper Bag Soft Side Shadow & Bottom Shadow */}
            <polygon points="44,230 174,230 174,232 44,232" fill="#D1D5DB" />
            <line x1="56" y1="105" x2="44" y2="232" stroke="#CBD5E1" strokeWidth="1.5" />

            {/* REAL OFFICIAL MEDICHAIN LOGO ON THE FRONT OF THE BAG */}
            <image 
              href="/logo.png" 
              x="68" 
              y="138" 
              width="92" 
              height="58" 
              preserveAspectRatio="xMidYMid meet" 
            />
          </svg>
        </div>

        {/* Floating Two-Tone Capsule Pill & Tablet (Left of Bag) */}
        <motion.div 
          animate={{ y: [0, -7, 0], rotate: [-45, -42, -45] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1 sm:left-4 top-22 sm:top-26 z-20 flex flex-col items-center pointer-events-auto"
        >
          {/* Angled Two-Tone Capsule */}
          <div 
            className="w-5 h-12 sm:w-6 sm:h-14 rounded-full overflow-hidden shadow-lg border border-white/70"
            style={{
              background: "linear-gradient(180deg, #7C3AED 0%, #6344E7 50%, #FFFFFF 50%, #F3F4F6 100%)",
              boxShadow: "0 8px 20px -2px rgba(99, 68, 231, 0.45)"
            }}
          >
            {/* Specular Glint */}
            <div className="w-1.5 h-6 bg-white/70 rounded-full mx-auto mt-1" />
          </div>
          {/* Small Floating Round Tablet with Scored Line */}
          <div className="w-4 h-4 rounded-full bg-white shadow-md border border-slate-200 mt-2 ml-4 flex items-center justify-center">
            <div className="w-2.5 h-0.5 bg-slate-200 rounded-full" />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
