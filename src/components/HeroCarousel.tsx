import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Sun, 
  SunMedium, 
  Sunset, 
  Moon, 
  ShieldCheck, 
  Zap, 
  Flame, 
  Clock 
} from "lucide-react";
import { HeroSlide, heroCarouselService, bulkDealsService } from "../services";
import { useReducedMotion } from "motion/react";

interface HeroCarouselProps {
  pharmacyName: string;
  onOpenScanner?: () => void;
  onBrowseCatalog?: () => void;
  onOpenBulkDeals?: (campaignId?: string) => void;
}

interface TimeGreetingInfo {
  greeting: string;
  badgeLabel: string;
  period: "morning" | "afternoon" | "evening" | "night";
  defaultSubtext: string;
  dispatchStatus: string;
  gradient: string;
}

function getTimeBasedGreeting(): TimeGreetingInfo {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Good morning",
      badgeLabel: "Morning Dispatch",
      period: "morning",
      defaultSubtext: "Order before 11:30 AM for express 2:00 PM depot delivery",
      dispatchStatus: "⚡ Express Dispatch Active",
      gradient: "from-amber-50/90 via-purple-50/40 to-lime-50/60"
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good afternoon",
      badgeLabel: "Afternoon Restock",
      period: "afternoon",
      defaultSubtext: "Same-day depot fulfillment running on standard schedule",
      dispatchStatus: "🚚 Live Depot Fulfillment",
      gradient: "from-purple-50/90 via-white to-lime-50/70"
    };
  } else if (hour >= 17 && hour < 22) {
    return {
      greeting: "Good evening",
      badgeLabel: "Evening Restock",
      period: "evening",
      defaultSubtext: "Queue wholesale consignments for early morning delivery",
      dispatchStatus: "📦 Overnight Queue Open",
      gradient: "from-purple-50/80 via-white to-amber-50/50"
    };
  } else {
    return {
      greeting: "Working late?",
      badgeLabel: "24/7 Digital Depot",
      period: "night",
      defaultSubtext: "Automated batch allocation active for 6:00 AM packing",
      dispatchStatus: "🌙 24/7 Order Desk Active",
      gradient: "from-indigo-50/80 via-white to-purple-50/50"
    };
  }
}

export default function HeroCarousel({
  pharmacyName,
  onOpenScanner,
  onBrowseCatalog,
  onOpenBulkDeals,
}: HeroCarouselProps) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvanceInterval, setAutoAdvanceInterval] = useState(5000);
  const [isPaused, setIsPaused] = useState(false);
  const [timeInfo, setTimeInfo] = useState<TimeGreetingInfo>(() => getTimeBasedGreeting());
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  
  const prefersReducedMotion = useReducedMotion();

  // Keep time greeting freshly synced
  useEffect(() => {
    setTimeInfo(getTimeBasedGreeting());
    const interval = setInterval(() => {
      setTimeInfo(getTimeBasedGreeting());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      const activeSlides = await heroCarouselService.getActiveSlides();
      const interval = await heroCarouselService.getAutoAdvanceInterval();
      setAutoAdvanceInterval(interval);

      // Synthesize Promo Slide if a bulk campaign is live
      const liveCampaign = await bulkDealsService.getLiveCampaign();
      let finalSlides = [...activeSlides];

      if (liveCampaign) {
        const promoSlide: HeroSlide = {
          id: `promo-${liveCampaign.id}`,
          type: "promo",
          title: liveCampaign.title || "Super Bulk Savings",
          subtitle: liveCampaign.subtext || "Unlock bulk pricing on key wholesale consignments!",
          cta_label: liveCampaign.cta_text || "Shop Bulk Deals",
          cta_route: `/bulk-deals/${liveCampaign.id}`,
          background_preset: liveCampaign.banner_color || "purple-dominant",
          display_order: 1.5,
          is_active: true
        };
        
        const existingPromoIndex = finalSlides.findIndex(s => s.type === "promo");
        if (existingPromoIndex !== -1) {
          promoSlide.display_order = finalSlides[existingPromoIndex].display_order;
          finalSlides[existingPromoIndex] = promoSlide;
        } else {
          finalSlides.push(promoSlide);
        }
      } else {
        finalSlides = finalSlides.filter(s => s.type !== "promo");
      }

      // Sort by display order
      finalSlides.sort((a, b) => a.display_order - b.display_order);
      
      // If no slides, fallback to greeting
      if (finalSlides.length === 0) {
        finalSlides = [{
          id: "fallback-greeting",
          type: "greeting",
          title: "{greeting}, {pharmacyName}",
          subtitle: "Manage your daily inventory & bulk wholesale orders",
          cta_label: "Browse Catalog",
          cta_route: "/search",
          background_preset: "purple-lime",
          display_order: 1,
          is_active: true
        }];
      }

      setSlides(finalSlides);
    } catch (err) {
      console.error("Failed to load carousel slides:", err);
    }
  };

  useEffect(() => {
    if (slides.length <= 1 || isPaused || prefersReducedMotion) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoAdvanceInterval);

    return () => clearInterval(timer);
  }, [slides.length, isPaused, autoAdvanceInterval, prefersReducedMotion]);

  const handleInteraction = () => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 8000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 40) {
      handleInteraction();
      if (diff > 0) {
        // swipe left -> next
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      } else {
        // swipe right -> prev
        setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
      }
    }
  };

  const resolveTitle = (slide: HeroSlide) => {
    let raw = slide.title || "";
    // Dynamically replace template variables
    raw = raw.replace(/\{pharmacyName\}/g, pharmacyName || "Valued Pharmacy");
    raw = raw.replace(/\{greeting\}/gi, timeInfo.greeting);
    
    // If title has a static greeting hardcoded like "Good morning", dynamically adapt it
    if (/^Good (morning|afternoon|evening|night)/i.test(raw)) {
      raw = raw.replace(/^Good (morning|afternoon|evening|night)/i, timeInfo.greeting);
    }
    
    return raw;
  };

  const renderPeriodIcon = () => {
    switch (timeInfo.period) {
      case "morning":
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case "afternoon":
        return <SunMedium className="w-3.5 h-3.5 text-amber-500" />;
      case "evening":
        return <Sunset className="w-3.5 h-3.5 text-orange-500" />;
      case "night":
      default:
        return <Moon className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  if (slides.length === 0) return null;

  return (
    <div 
      className="w-full px-4 pt-3 pb-1 flex-shrink-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full rounded-3xl overflow-hidden shadow-xs border border-purple-200/80 bg-white group">
        
        {/* Animated Carousel Track */}
        <div 
          className={`flex w-full ${prefersReducedMotion ? '' : 'transition-transform duration-500 ease-out'}`}
          style={{ 
            transform: prefersReducedMotion ? 'none' : `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {slides.map((slide, idx) => {
            const isVisible = prefersReducedMotion ? idx === currentIndex : true;
            if (prefersReducedMotion && !isVisible) return null;
            
            const isGreeting = slide.type === "greeting";
            const isPromo = slide.type === "promo";
            const titleText = resolveTitle(slide);
            const subtitleText = slide.subtitle || (isGreeting ? timeInfo.defaultSubtext : null);

            return (
              <div 
                key={slide.id} 
                className={`w-full min-h-[148px] sm:min-h-[160px] flex-shrink-0 relative px-5 py-4 sm:p-6 flex flex-col justify-between overflow-hidden bg-gradient-to-br ${
                  isPromo 
                    ? "from-purple-100/90 via-white to-lime-100/80" 
                    : isGreeting 
                      ? timeInfo.gradient 
                      : "from-purple-50/90 via-white to-lime-50/70"
                } text-slate-900`}
              >
                {/* Visual Depth: Decorative Glow Orbs */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-lime/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-brand-purple/15 rounded-full blur-3xl pointer-events-none" />
                
                {/* Subtle Geometric Supply Chain Watermark */}
                <svg 
                  className="absolute right-2 -bottom-4 w-40 h-40 opacity-[0.05] pointer-events-none select-none text-purple-900" 
                  viewBox="0 0 100 100" 
                  fill="currentColor"
                >
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path d="M50 20 L50 80 M20 50 L80 50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="25" cy="25" r="8" />
                  <circle cx="75" cy="25" r="8" />
                  <circle cx="25" cy="75" r="8" />
                  <circle cx="75" cy="75" r="8" />
                </svg>

                {/* Top Row: Context Badges */}
                <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap mb-1.5">
                  {isGreeting ? (
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-purple-200/70 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-800 shadow-2xs">
                      {renderPeriodIcon()}
                      <span>{timeInfo.badgeLabel}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse" />
                    </div>
                  ) : isPromo ? (
                    <div className="flex items-center gap-1 bg-brand-lime text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide shadow-2xs">
                      <Flame className="w-3 h-3 fill-slate-950" />
                      <span>Super Wholesale Deal</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-purple-100/90 backdrop-blur-md border border-purple-200/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-purple-900">
                      <Zap className="w-3 h-3 text-purple-700" />
                      <span>Special Bulletin</span>
                    </div>
                  )}

                  {/* Secondary Live Status Indicator */}
                  <div className="hidden xs:flex items-center gap-1 text-[9px] font-semibold text-emerald-800 bg-emerald-50/90 backdrop-blur-sm px-2 py-0.5 rounded-full border border-emerald-200/80 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>DGDA Verified B2B</span>
                  </div>
                </div>

                {/* Center: Main Headline & Dynamic Pharmacy Name */}
                <div className="relative z-10 my-auto">
                  <h1 className="text-base sm:text-lg font-black leading-tight tracking-tight text-slate-900">
                    {titleText}
                  </h1>
                  
                  {subtitleText && (
                    <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-1 leading-snug line-clamp-1 max-w-[90%]">
                      {subtitleText}
                    </p>
                  )}
                </div>

                {/* Bottom Row: Call-to-Actions & Micro-Interactions */}
                <div className="relative z-10 flex items-center gap-2.5 mt-2.5 pt-1">
                  {isGreeting && onOpenScanner && (
                    <button
                      onClick={() => { handleInteraction(); onOpenScanner(); }}
                      className="bg-brand-lime hover:bg-brand-lime-dark text-slate-950 font-black py-1.5 px-3.5 rounded-xl text-[11px] flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                      <span>Scan Prescription</span>
                    </button>
                  )}

                  {slide.cta_label && (
                    <button
                      onClick={() => {
                        handleInteraction();
                        if (isPromo && slide.cta_route?.startsWith("/bulk-deals/") && onOpenBulkDeals) {
                          onOpenBulkDeals(slide.cta_route.split("/").pop());
                        } else if (onBrowseCatalog) {
                          onBrowseCatalog();
                        }
                      }}
                      className={`font-extrabold py-1.5 px-3 rounded-xl text-[11px] flex items-center gap-1 active:scale-95 transition-all cursor-pointer ${
                        isGreeting
                          ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                          : isPromo
                            ? "bg-brand-lime hover:bg-brand-lime-dark text-slate-950 shadow-xs"
                            : "bg-white text-slate-900 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <span>{slide.cta_label}</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  )}

                  {/* Dispatch Badge on Mobile */}
                  <div className="ml-auto hidden sm:flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-700">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span>{timeInfo.dispatchStatus}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Desktop Navigation Chevrons */}
        {slides.length > 1 && (
          <>
            <button
              onClick={() => {
                handleInteraction();
                setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer hidden md:flex border border-slate-200/80"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                handleInteraction();
                setCurrentIndex((prev) => (prev + 1) % slides.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer hidden md:flex border border-slate-200/80"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Pagination Indicator Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center items-center gap-1.5 z-20 pointer-events-none">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { handleInteraction(); setCurrentIndex(idx); }}
                className={`h-1.5 rounded-full transition-all duration-300 pointer-events-auto cursor-pointer ${
                  idx === currentIndex 
                    ? "bg-brand-purple w-5 shadow-2xs" 
                    : "bg-slate-300 hover:bg-slate-400 w-1.5"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
