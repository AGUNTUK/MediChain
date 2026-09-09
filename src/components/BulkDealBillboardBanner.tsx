import React from "react";
import { 
  Shield, Zap, Truck, Check, Star, ArrowRight, Package 
} from "lucide-react";
import { BulkCampaign, TrustBadgeItem, Product } from "../types";
import { MediChainIconOnly } from "./MediChainLogo";

interface BulkDealBillboardBannerProps {
  campaign: BulkCampaign | null;
  onOpenBulkDeals?: (campaignId?: string) => void;
  onSelectProduct?: (productId: string) => void;
  onOpenProductDetails?: (product: Product) => void;
}

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  lightning: Zap,
  truck: Truck,
  check: Check,
  star: Star
};

export default function BulkDealBillboardBanner({
  campaign,
  onOpenBulkDeals,
  onSelectProduct,
  onOpenProductDetails
}: BulkDealBillboardBannerProps) {
  // If no campaign is currently Live, do not render at all
  if (!campaign || campaign.status !== "Live") {
    return null;
  }

  const badges: TrustBadgeItem[] = (campaign.trust_badges && campaign.trust_badges.length > 0)
    ? campaign.trust_badges.slice(0, 3)
    : [
        { icon: "shield", label: "Trusted Brands" },
        { icon: "lightning", label: "Bulk Discounts" },
        { icon: "truck", label: "Fast Delivery" }
      ];

  const featured = campaign.featured_product;
  const discountPercent = campaign.discount_display_percent ?? 25;
  const ctaText = campaign.cta_text || "Order Now";
  const titleText = campaign.title || "Super Bulk Savings";
  const tagline = campaign.subtext || "B2B Pharma Wholesale, Made Smarter";

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (featured && onOpenProductDetails && (campaign.cta_link?.includes("product") || !campaign.cta_link)) {
      onOpenProductDetails(featured);
    } else if (featured?.id && onSelectProduct && campaign.cta_link?.startsWith("/product/")) {
      onSelectProduct(featured.id);
    } else if (onOpenBulkDeals) {
      onOpenBulkDeals(campaign.id);
    } else {
      const el = document.getElementById("home-product-catalog");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section 
      aria-label="Bulk Deal Billboard Banner"
      onClick={handleAction}
      className="group relative w-full overflow-hidden rounded-3xl border border-purple-200/90 shadow-lg shadow-purple-900/5 bg-gradient-to-r from-[#F5EEFE] via-[#FAF5FF] to-[#F1E5FE] transition-all duration-300 hover:shadow-xl hover:shadow-purple-900/10 hover:border-purple-300 cursor-pointer"
    >
      {/* DECORATIVE ORGANIC SOFT BLOBS (Tucked into corners behind content) */}
      <div 
        className="pointer-events-none absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#A855F7]/15 blur-2xl transition-transform duration-700 group-hover:scale-110" 
        aria-hidden="true" 
      />
      <div 
        className="pointer-events-none absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-[#A3E635]/25 blur-2xl transition-transform duration-700 group-hover:scale-110" 
        aria-hidden="true" 
      />
      <div 
        className="pointer-events-none absolute top-1/2 left-1/4 w-36 h-36 rounded-full bg-[#7C3AED]/10 blur-xl" 
        aria-hidden="true" 
      />

      {/* THREE HORIZONTAL SECTIONS CONTAINER (Responsive Stacking on Mobile) */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-3 sm:p-4 md:py-2 md:px-5 gap-3 md:gap-2 h-full min-h-[120px]">
        
        {/* ======================================================== */}
        {/* LEFT SECTION (~20% width) */}
        {/* ======================================================== */}
        <div className="w-full md:w-[22%] shrink-0 flex flex-col justify-center border-b md:border-b-0 md:border-r border-purple-200/60 pb-2 md:pb-0 md:pr-3">
          {/* 3 Small Trust-Badge Icons in a row with 2-word labels */}
          <div className="grid grid-cols-3 gap-2">
            {badges.map((badge, idx) => {
              const IconComp = BADGE_ICONS[badge.icon] || Shield;
              return (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div className="w-7 h-7 rounded-lg bg-white/90 border border-purple-200/80 shadow-2xs flex items-center justify-center text-[#7C3AED] group-hover:scale-105 transition-transform">
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-[#14161B] mt-1 line-clamp-2 leading-tight max-w-[65px]">
                    {badge.label || (idx === 0 ? "Trusted Brands" : idx === 1 ? "Bulk Discounts" : "Fast Delivery")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* MIDDLE SECTION (~45% width, centered) */}
        {/* ======================================================== */}
        <div className="w-full md:w-[45%] flex items-center justify-center px-2 md:px-3 py-1">
          <div className="flex items-center gap-4 sm:gap-6 max-w-md">
            
            {/* Product Details (Text) */}
            <div className="text-left min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-200/50 text-[#7C3AED] text-[10px] font-black uppercase tracking-wider mb-1">
                <Zap className="w-3 h-3 fill-current" />
                <span>Featured Medicine</span>
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-[#14161B] tracking-tight leading-tight line-clamp-2">
                {featured?.name || "Napa Extra 500mg"}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-[#6B7280] mt-0.5 line-clamp-1">
                {featured?.strength ? `${featured.strength} • ` : ""}
                {featured?.genericName || (featured as any)?.generic_name || "Paracetamol + Caffeine"}
              </p>
              <p className="text-[11px] text-[#7C3AED] font-bold mt-1">
                {featured?.company ? `${featured.company}` : "Square Pharmaceuticals Ltd"}
              </p>
            </div>

            {/* Featured Product Image (Slightly rotated, soft drop shadow) */}
            <div className="shrink-0 relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 rounded-2xl bg-white/85 border border-purple-200/70 p-2 flex items-center justify-center transform -rotate-6 group-hover:rotate-0 transition-transform duration-300 shadow-md shadow-purple-900/10">
                {featured?.imageUrl || (featured as any)?.image_url ? (
                  <img
                    src={featured.imageUrl || (featured as any).image_url}
                    alt={featured.name}
                    className="w-full h-full object-contain filter drop-shadow-md"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-purple-50 flex flex-col items-center justify-center text-purple-400">
                    <Package className="w-8 h-8 text-purple-400" />
                    <span className="text-[8px] font-bold text-purple-600 mt-1">Pharma Box</span>
                  </div>
                )}
              </div>
              {/* Subtle Ambient Glow behind product image */}
              <div className="absolute inset-0 bg-[#A3E635]/30 rounded-2xl filter blur-lg -z-10" />
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT SECTION (~35% width) */}
        {/* ======================================================== */}
        <div className="w-full md:w-[33%] shrink-0 flex flex-col items-center md:items-end justify-center gap-2.5">
          
          <div className="flex items-center gap-3 w-full justify-center md:justify-end">
            {/* Small rotated pill-shaped badge with campaign's title text */}
            <div className="inline-block transform -rotate-3 group-hover:-rotate-1 transition-transform">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#7C3AED] text-white text-[11px] font-black tracking-wide shadow-xs">
                <Star className="w-3 h-3 fill-[#A3E635] text-[#A3E635]" />
                <span>{titleText}</span>
              </span>
            </div>

            {/* "Torn Paper" Style Badge (irregular jagged edges) in Purple Gradient with Lime Green % */}
            <div className="relative group-hover:scale-105 transition-transform duration-300 shrink-0">
              <div 
                className="relative bg-gradient-to-br from-[#A855F7] to-[#7C3AED] px-3.5 py-1.5 text-center shadow-md shadow-purple-900/20"
                style={{
                  clipPath: "polygon(0% 6%, 6% 0%, 14% 5%, 22% 1%, 30% 6%, 38% 1%, 46% 5%, 54% 0%, 62% 5%, 70% 1%, 78% 6%, 86% 1%, 94% 5%, 100% 0%, 96% 12%, 100% 22%, 95% 32%, 100% 42%, 96% 52%, 100% 62%, 95% 72%, 100% 82%, 96% 92%, 100% 100%, 92% 95%, 84% 100%, 76% 95%, 68% 100%, 60% 95%, 52% 100%, 44% 95%, 36% 100%, 28% 95%, 20% 100%, 12% 95%, 4% 100%, 0% 94%, 5% 82%, 0% 72%, 4% 62%, 0% 52%, 5% 42%, 0% 32%, 4% 22%, 0% 12%)"
                }}
              >
                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-xl sm:text-2xl font-black text-[#A3E635] tracking-tight leading-none font-mono">
                    {discountPercent}%
                  </span>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none mt-0.5">
                    OFF
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* "Order Now" Button in Solid Lime Green with Dark Circular Arrow Icon */}
          <button
            type="button"
            onClick={handleAction}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#A3E635] hover:bg-[#92dc22] active:bg-[#84c81c] text-[#14161B] rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm shadow-lime-900/20 group-hover:scale-102 transition-all cursor-pointer"
          >
            <span>{ctaText}</span>
            <span className="w-5 h-5 rounded-full bg-[#14161B] text-[#A3E635] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="w-3 h-3 stroke-[3]" />
            </span>
          </button>

        </div>

      </div>
    </section>
  );
}
