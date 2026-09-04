import React from "react";
import { Sun, Scan, ArrowRight } from "lucide-react";
import GoodMorningHeroVisual from "./GoodMorningHeroVisual";

interface HeroCarouselProps {
  pharmacyName: string;
  onOpenScanner?: () => void;
  onBrowseCatalog?: () => void;
  onOpenBulkDeals?: (campaignId?: string) => void;
}

export default function HeroCarousel({
  pharmacyName,
  onOpenScanner,
  onBrowseCatalog,
}: HeroCarouselProps) {
  const cleanName = pharmacyName?.trim() || "Sohel Pharma";

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-xs sm:shadow-sm flex-shrink-0">
      <div className="w-full relative bg-gradient-to-r from-white via-[#FAF8FF] to-[#ECE7FE] px-4 sm:px-8 md:px-10 py-5 sm:py-6 sm:pb-8 flex items-center justify-between min-h-[250px] sm:min-h-[275px] md:min-h-[300px] overflow-hidden">
        {/* Left Text & CTA Content */}
        <div className="relative z-20 w-full sm:max-w-[56%] md:max-w-[55%] lg:max-w-[54%] flex flex-col justify-center">
          
          {/* Eyebrow: GOOD MORNING */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
            <div className="w-4.5 h-4.5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Sun className="w-3 h-3 stroke-[2.5]" />
            </div>
            <span className="text-[11px] sm:text-xs font-black tracking-[0.2em] text-[#6344E7] uppercase">
              GOOD MORNING
            </span>
          </div>

          {/* Pharmacy Heading: Sohel Pharma 👋 */}
          <h1 className="text-2xl sm:text-3xl md:text-[32px] font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2">
            <span className="truncate">{cleanName}</span>
            <span className="inline-block hover:animate-wiggle shrink-0 cursor-default">👋</span>
          </h1>

          {/* Brand Tagline / Slogan: ফার্মেসির স্মার্ট পার্টনার */}
          <div className="mt-2 sm:mt-2.5 text-base sm:text-lg md:text-[22px] font-black text-slate-800 leading-snug tracking-tight">
            <span className="text-[#6344E7]">ফার্মেসির স্মার্ট পার্টনার</span>
          </div>

          {/* Value Bullet Points: 
              ২১,০০০+ ওষুধ • সাশ্রয়ী দাম
              সহজ অর্ডার • দ্রুত ডেলিভারি
              প্রতিযোগিতামূলক wholesale pricing ও আকর্ষণীয় discount */}
          <div className="mt-2.5 sm:mt-3 space-y-1 sm:space-y-1.5 text-xs sm:text-[13px] font-bold text-slate-600">
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
