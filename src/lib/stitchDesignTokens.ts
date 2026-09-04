/**
 * Stitch Design System Tokens & Presets
 * Inspired by Google Stitch AI-native UI/UX design architecture.
 * Provides clean tokenized styling, elevation hierarchies, motion curves, and micro-interactions.
 */

export const StitchDesignTokens = {
  // Color Palette
  colors: {
    primary: "#6344E7",       // MediChain Orchid Purple
    primaryDark: "#4F3799",
    primaryLight: "#EDE8FF",
    accent: "#70C016",        // MediChain Fresh Lime
    accentHover: "#62AA12",
    accentLight: "#F2FCE2",
    neutralCanvas: "#FFFFFF",
    neutralTint: "#FAF8FF",
    borderSubtle: "rgba(99, 102, 231, 0.12)",
    textPrimary: "#0F172A",   // Slate 900
    textSecondary: "#64748B", // Slate 500
    textTertiary: "#94A3B8",  // Slate 400
  },

  // Elevation Levels
  elevation: {
    flat: "border border-slate-200/80 bg-white",
    card: "border border-slate-200/90 bg-white shadow-xs hover:shadow-sm transition-shadow",
    floating: "border border-purple-150/80 bg-white/95 backdrop-blur-md shadow-lg",
    interactive: "border border-slate-200 bg-white shadow-xs hover:shadow-md active:scale-[0.98] transition-all",
    accentPill: "bg-[#70C016] text-white font-bold shadow-xs hover:shadow-md hover:shadow-lime-500/20 active:scale-[0.98] transition-all",
  },

  // Motion Transitions (Framer Motion / Tailwind)
  motion: {
    springBouncy: { type: "spring", stiffness: 400, damping: 25 },
    springGentle: { type: "spring", stiffness: 260, damping: 20 },
    springSnappy: { type: "spring", stiffness: 500, damping: 30 },
    easeOutQuint: [0.22, 1, 0.36, 1],
  },

  // Typography Scales
  typography: {
    heroGreeting: "text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight",
    heroSubtitle: "text-xs sm:text-sm md:text-base text-slate-500 font-medium leading-snug",
    tagUppercase: "text-xs sm:text-sm font-extrabold tracking-[0.16em] uppercase",
    buttonLabel: "text-xs sm:text-sm font-bold tracking-normal",
    cardHeading: "text-base sm:text-lg font-bold text-slate-900",
    badgeLabel: "text-[10px] sm:text-xs font-semibold",
  },

  // Responsive Grid Rhythms
  layout: {
    containerMax: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    cardRadius: "rounded-2xl sm:rounded-3xl",
    pillRadius: "rounded-xl sm:rounded-2xl",
  }
} as const;

export default StitchDesignTokens;
