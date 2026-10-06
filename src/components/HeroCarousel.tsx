import React, { useState, useEffect } from "react";
import { Sun, Sunrise, Sunset, Moon, Scan, ArrowRight } from "lucide-react";
import GoodMorningHeroVisual from "./GoodMorningHeroVisual";

interface HeroCarouselProps {
  pharmacyName: string;
  onOpenScanner?: () => void;
  onBrowseCatalog?: () => void;
  onOpenBulkDeals?: (campaignId?: string) => void;
}

interface GreetingConfig {
  eyebrow: string;
  bangla: string;
  creativeTagline: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconText: string;
  emoji: string;
}

function getTimeGreeting(): GreetingConfig {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      eyebrow: "GOOD MORNING",
      bangla: "শুভ সকাল",
      creativeTagline: "দিনের শুরুতে ফার্মেসির ফ্রেশ স্টক প্রস্তুত রাখুন",
      icon: Sunrise,
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      emoji: "☀️",
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      eyebrow: "GOOD AFTERNOON",
      bangla: "শুভ দুপুর",
      creativeTagline: "ব্যস্ত সময়ে ফার্মেসির স্টক সবসময় ফুল রাখুন",
      icon: Sun,
      iconBg: "bg-orange-100",
      iconText: "text-orange-600",
      emoji: "🌤️",
    };
  } else if (hour >= 17 && hour < 20) {
    return {
      eyebrow: "GOOD EVENING",
      bangla: "শুভ সন্ধ্যা",
      creativeTagline: "সন্ধ্যার পিক আওয়ারে নিরবচ্ছিন্ন ওষুধের সাপ্লাই",
      icon: Sunset,
      iconBg: "bg-purple-100",
      iconText: "text-purple-600",
      emoji: "🌆",
    };
  } else if (hour >= 20 && hour < 24) {
    return {
      eyebrow: "GOOD NIGHT",
      bangla: "শুভ রাত্রি",
      creativeTagline: "আগামীকালের স্টক আজ রাতেই গুছিয়ে অর্ডার করুন",
      icon: Moon,
      iconBg: "bg-indigo-100",
      iconText: "text-indigo-600",
      emoji: "🌙",
    };
  } else {
    // 00:00 - 04:59 (Late Night / Midnight)
    return {
      eyebrow: "LATE HOURS",
      bangla: "গভীর রাত",
      creativeTagline: "২৪/৭ সহজ অর্ডার, সকাল হলেই দ্রুততম ডেলিভারি",
      icon: Moon,
      iconBg: "bg-slate-200",
      iconText: "text-indigo-700",
      emoji: "✨",
    };
  }
}

export default function HeroCarousel({
  pharmacyName,
  onOpenScanner,
  onBrowseCatalog,
}: HeroCarouselProps) {
  const cleanName = pharmacyName?.trim() || "Sohel Pharma";
  const [greeting, setGreeting] = useState<GreetingConfig>(getTimeGreeting);

  useEffect(() => {
    setGreeting(getTimeGreeting());
    const timer = setInterval(() => {
      setGreeting(getTimeGreeting());
    }, 60000); // re-evaluate every minute
    return () => clearInterval(timer);
  }, []);

  const GreetingIcon = greeting.icon;

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-xs sm:shadow-sm flex-shrink-0">
      <div className="w-full relative bg-gradient-to-r from-white via-[#FAF8FF] to-[#ECE7FE] px-4 sm:px-8 md:px-10 py-5 sm:py-6 flex items-center justify-between min-h-[200px] sm:min-h-[220px] md:min-h-[240px] overflow-hidden">
        {/* Left Text & CTA Content */}
        <div className="relative z-20 w-full sm:max-w-[56%] md:max-w-[55%] lg:max-w-[54%] flex flex-col justify-center">
          
          {/* Eyebrow: Dynamic Greeting according to time */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 flex-wrap">
            <div className={`w-4.5 h-4.5 rounded-full ${greeting.iconBg} flex items-center justify-center ${greeting.iconText} shrink-0`}>
              <GreetingIcon className="w-3 h-3 stroke-[2.5]" />
            </div>
            <span className="text-[11px] sm:text-xs font-black tracking-[0.16em] text-[#6344E7] uppercase">
              {greeting.eyebrow}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500">
              • {greeting.bangla}
            </span>
          </div>

          {/* Pharmacy Heading: Sohel Pharma */}
          <h1 className="text-2xl sm:text-3xl md:text-[32px] font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2">
            <span className="truncate">{cleanName}</span>
            <span className="inline-block hover:animate-wiggle shrink-0 cursor-default" title={greeting.bangla}>
              {greeting.emoji}
            </span>
          </h1>

          {/* Dynamic Creative Tagline */}
          <p className="text-[11px] sm:text-xs font-extrabold text-[#6344E7] mt-0.5 tracking-tight flex items-center gap-1">
            <span>✨</span>
            <span>{greeting.creativeTagline}</span>
          </p>

          {/* Value Bullet Points */}
          <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-1.5 text-xs sm:text-[13px] font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-[#70C016] flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
              <span>২১,০০০+ ওষুধ • সাশ্রয়ী দাম</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-[#70C016] flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
              <span>সহজ অর্ডার • দ্রুত ডেলিভারি</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-purple-100 text-[#6344E7] flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
              <span className="text-[#4F3799] font-extrabold">প্রতিযোগিতামূলক wholesale pricing ও আকর্ষণীয় discount</span>
            </div>
          </div>

          {/* CTA Buttons: [ ক্যাটালগ দেখুন → ] */}
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onBrowseCatalog}
              className="bg-[#70C016] hover:bg-[#62AA12] text-white font-black text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex items-center gap-2 shadow-sm hover:shadow-md hover:shadow-lime-500/25 active:scale-[0.98] transition-all cursor-pointer group"
            >
              <span>ক্যাটালগ দেখুন</span>
              <ArrowRight className="w-4 h-4 text-white stroke-[2.5] group-hover:translate-x-1 transition-transform" />
            </button>
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-extrabold text-xs sm:text-sm px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl flex items-center gap-1.5 shadow-xs hover:shadow-md active:scale-[0.98] transition-all cursor-pointer group"
                title="প্রেসক্রিপশন স্ক্যান করুন"
              >
                <Scan className="w-4 h-4 text-[#6344E7] stroke-[2.4]" />
                <span className="hidden sm:inline">Rx স্ক্যান</span>
              </button>
            )}
          </div>
        </div>

        {/* Right 3D Visual: 💊 📦 MediChain */}
        <div className="relative z-10 w-[44%] sm:w-[44%] md:w-[45%] lg:w-[46%] h-full flex items-center justify-end">
          <GoodMorningHeroVisual className="w-full h-full max-w-[430px]" />
        </div>
      </div>
    </div>
  );
}
