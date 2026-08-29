import React, { useState, useEffect } from "react";
import {
  Bell,
  Search,
  ChevronRight,
  TrendingUp,
  Tag,
  Package,
  Sparkles,
  RefreshCw,
  Clock,
  Heart,
  Plus,
  ShoppingCart,
  Minus,
  Check,
  Truck,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flame
} from "lucide-react";
import MediChainLogo from "./MediChainLogo";
import { Product, Order } from "../types";
import { productService } from "../services";
import NotificationBell from "./NotificationBell";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import ErrorState from "./ErrorState";
import { formatProductPriceLabel } from "../lib/utils";
import { apiCache } from "../lib/apiCache";
import { useCartFeedback } from "../context/FlyToCartContext";
import PrescriptionScanner from "./PrescriptionScanner";
import HeroCarousel from "./HeroCarousel";
import CategoryIcon, { getCategoryConfig } from "./CategoryIcon";

interface HomeProps {
  onTriggerSearch: (query?: string, category?: string) => void;
  onAddToCart: (productId: string, qty: number) => Promise<boolean>;
  onToggleFavourite: (productId: string) => void;
  favouriteIds: string[];
  pharmacyName?: string;
  onOpenProductDetails: (product: Product) => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  cartQuantities?: Record<string, number>;
  onUpdateCartQty?: (productId: string, currentQty: number, change: number) => Promise<void>;
  onOpenCart?: () => void;
  cartCount?: number;
  onOpenBulkDeals?: (campaignId?: string) => void;
  orders?: Order[];
  onTrackOrder?: (orderId: string) => void;
}

export default function Home({
  onTriggerSearch,
  onAddToCart,
  onToggleFavourite,
  favouriteIds,
  pharmacyName = "City Pharma",
  onOpenProductDetails,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  cartQuantities = {},
  onUpdateCartQty,
  onOpenCart,
  cartCount = 0,
  onOpenBulkDeals,
  orders = [],
  onTrackOrder
}: HomeProps) {
  const [bestDeals, setBestDeals] = useState<Product[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [highestDiscounts, setHighestDiscounts] = useState<Product[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [liveCampaign, setLiveCampaign] = useState<any>(null);
  // If categories are already cached, we can skip the initial loading skeleton flash
  const [isLoading, setIsLoading] = useState(!apiCache.get("categories"));
  const [error, setError] = useState<string | null>(null);

  const DEFAULT_CATEGORIES = [
    "Tablet",
    "Capsule",
    "Syrup",
    "Suspension",
    "Drops",
    "Injection",
    "Infusion",
    "Inhaler",
    "Cream",
    "Ointment",
    "Gel",
    "Lotion",
    "Powder",
    "Sachet",
    "Nasal Spray",
    "Suppository",
    "Patch",
    "Insulin",
    "Vaccine",
    "Medical Devices",
    "Surgical Items",
    "Dressing",
    "Bandage",
    "Gloves",
    "Masks",
    "Test Kits",
    "Herbal",
    "Ayurvedic",
    "Vitamins",
    "Supplements",
    "Baby Care",
    "Diabetic Care",
    "First Aid"
  ];

  const fetchHomeWidgets = async () => {
    try {
      if (!apiCache.get("categories")) {
        setIsLoading(true);
      }
      setError(null);
      // 0. Fetch Categories
      const categoriesData = await productService.getCategories();
      if (categoriesData.length > 0) {
        setDbCategories(categoriesData);
      } else {
        // Fallback to default full list if DB is empty
        setDbCategories(DEFAULT_CATEGORIES);
      }

      // 1. Fetch Deals
      const dataDeals = await productService.getProducts({ filter: "deals" });
      setBestDeals(dataDeals.slice(0, 3));
      setHighestDiscounts(dataDeals.slice(0, 4));

      // 2. Fetch Frequently ordered
      const dataFreq = await productService.getProducts({ filter: "frequent" });
      setFrequentProducts(dataFreq.slice(0, 4));

      // 3. Fetch Live Campaign
      const { bulkDealsService } = await import("../services");
      const activeCampaign = await bulkDealsService.getLiveCampaign();
      setLiveCampaign(activeCampaign);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeWidgets();
  }, []);

  const { triggerCartFeedback, triggerButtonFeedback } = useCartFeedback();

  const handleQuickBuy = async (
    productId: string,
    defaultBulkSize: number = 1,
    e?: React.MouseEvent<HTMLElement>,
    imageSrc?: string
  ) => {
    triggerCartFeedback();
    triggerButtonFeedback(productId);
    setSuccessId(productId);
    const success = await onAddToCart(productId, defaultBulkSize);
    if (success) {
      setTimeout(() => setSuccessId(null), 1200);
    } else {
      setSuccessId(null);
    }
  };

  const displayCategoryNames = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...dbCategories
  ]));

  const visibleCategoryNames = showAllCategories ? displayCategoryNames : displayCategoryNames.slice(0, 12);

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col select-none overflow-y-auto">
      {/* Header Area */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <MediChainLogo size="sm" withText={true} textColor="dark" />
        </div>

        {/* Notifications and status */}
        <div className="flex items-center gap-2">
          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 relative cursor-pointer flex items-center justify-center border border-slate-200/20 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-lime text-slate-900 font-extrabold text-[8px] px-1.5 py-0.5 rounded-full min-w-4 text-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}
          <NotificationBell />
        </div>
      </div>

      {/* Main Body */}
      {error ? (
        <div className="flex-1 overflow-hidden relative">
          <ErrorState 
            message={error} 
            onRetry={fetchHomeWidgets} 
          />
        </div>
      ) : (
        <>
          <HeroCarousel pharmacyName={pharmacyName} onOpenScanner={() => setIsScannerOpen(true)} onBrowseCatalog={() => onTriggerSearch()} onOpenBulkDeals={onOpenBulkDeals} />
          
          <div className="p-4 space-y-4 pb-32">
            {/* Active Order Live Tracker Pulse Card */}
            {(() => {
              const activeOrder = orders.find(o => 
                ["Pending", "Processing", "Dispatched", "Out for Delivery"].includes(o.status)
              );
              if (!activeOrder) return null;

              return (
                <div 
                  onClick={() => onTrackOrder?.(activeOrder.id)}
                  className="bg-linear-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-2xl p-3.5 shadow-lg border border-purple-800/30 flex items-center justify-between gap-3 cursor-pointer hover:scale-[1.01] transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/30 border border-brand-purple/40 flex items-center justify-center shrink-0 text-brand-lime relative">
                      <Truck className="w-5 h-5 animate-pulse" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-lime rounded-full ring-2 ring-slate-950 animate-ping"></span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-brand-lime tracking-wider font-mono">
                          {activeOrder.status === "Out for Delivery" ? "রাইডার ডেলিভারি নিয়ে আসছেন" : "ডিপোতে প্রসেসিং চলছে"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">#{activeOrder.id.substring(0, 8)}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-100 truncate">
                        {activeOrder.items?.length || 1} টি ওষুধ • ৳{activeOrder.totalAmount?.toLocaleString()} (ওটিপি দেখতে ট্যাপ করুন)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 bg-brand-lime hover:bg-brand-lime-dark text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition-transform group-hover:scale-105"
                  >
                    <span>ট্র্যাক করুন</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })()}

            {/* Search & Scan Actions */}
            <div className="flex gap-2">
              <div
                onClick={() => onTriggerSearch()}
                className="flex-1 flex items-center bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
              >
                <Search className="text-slate-400 group-hover:text-brand-purple w-4.5 h-4.5 mr-2.5 shrink-0 transition-colors" />
                <span className="text-xs text-slate-400 font-semibold truncate">১০,০০০+ ওষুধ বা জেনেরিক নাম লিখে খুঁজুন...</span>
              </div>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="shrink-0 flex items-center justify-center gap-1.5 px-4 bg-brand-purple text-white rounded-2xl font-bold text-xs hover:shadow-lg hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer shadow-sm shadow-indigo-200"
              >
                <Sparkles className="w-3.5 h-3.5" />
                প্রেসক্রিপশন স্ক্যান
              </button>
            </div>

            {isScannerOpen && (
              <PrescriptionScanner onClose={() => setIsScannerOpen(false)} />
            )}

            {/* Category Carousel Grid */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-0.5">
                <h3 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-brand-purple" />
                  ওষুধের ধরন ও ক্যাটাগরি
                </h3>
                {displayCategoryNames.length > 12 && (
                  <button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="text-[11px] font-extrabold text-brand-purple hover:underline cursor-pointer"
                  >
                    {showAllCategories ? "কম দেখুন" : "সব দেখুন"}
                  </button>
                )}
              </div>
              
              {showAllCategories ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
                  {visibleCategoryNames.map(name => {
                    const config = getCategoryConfig(name);
                    return (
                      <button
                        key={name}
                        onClick={() => onTriggerSearch(undefined, name)}
                        className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-slate-100/90 shadow-2xs cursor-pointer hover:shadow-md hover:border-slate-200/90 hover:scale-[1.03] transition-all bg-white group"
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-1.5 p-2.5 transition-transform group-hover:scale-110 ${config.bg} ${config.text} border ${config.border}`}>
                          <CategoryIcon name={name} className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center group-hover:text-brand-purple transition-colors">
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-2.5 pb-2 -mx-4 px-4 scrollbar-hide snap-x">
                  {visibleCategoryNames.map(name => {
                    const config = getCategoryConfig(name);
                    return (
                      <button
                        key={name}
                        onClick={() => onTriggerSearch(undefined, name)}
                        className="flex-shrink-0 snap-start flex flex-col items-center justify-center p-2 w-[82px] h-[90px] rounded-2xl border border-slate-100/90 shadow-2xs cursor-pointer hover:shadow-md hover:border-slate-200/90 hover:scale-[1.03] transition-all bg-white group"
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-1.5 p-2.5 transition-transform group-hover:scale-110 ${config.bg} ${config.text} border ${config.border}`}>
                          <CategoryIcon name={name} className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center group-hover:text-brand-purple transition-colors">
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Wholesale Bulk Campaign Banner Card */}
            {liveCampaign && (
              <div 
                onClick={() => onOpenBulkDeals?.(liveCampaign.id)}
                className="bg-linear-to-r from-purple-950 via-indigo-900 to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-purple-500/20 relative overflow-hidden cursor-pointer hover:scale-[1.01] transition-all group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-purple-500/20 to-transparent blur-2xl pointer-events-none"></div>
                <div className="relative z-10 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="bg-brand-lime text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-slate-950" />
                      লাইভ পাইকারি স্পেশাল অফার
                    </span>
                    <span className="text-[10px] text-purple-200 font-mono font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-brand-lime" />
                      সীমিত সময়ের অফার
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                      {liveCampaign.title || "ম্যানুফ্যাকচারার কোয়ার্টারলি পাইকারি অফার"}
                    </h3>
                    <p className="text-xs text-purple-200/80 font-medium line-clamp-1 mt-0.5">
                      {liveCampaign.description || "একসাথে বেশি ওষুধ কিনে সর্বোচ্চ ২৮% পর্যন্ত বাড়তি লাভ উপভোগ করুন।"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-brand-lime">বেশি পরিমাণে বিশেষ ছাড়</span>
                      <span className="text-[10px] text-purple-300">• সরাসরি ওষুধ কোম্পানি থেকে</span>
                    </div>
                    <button
                      type="button"
                      className="bg-white hover:bg-slate-100 text-brand-purple font-black text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-md group-hover:scale-105 transition-transform"
                    >
                      <span>অফার দেখুন</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Frequent / Recently Ordered */}
            {(frequentProducts.length > 0 || isLoading) && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-lime" />
                    নিয়মিত ক্রয়ের ওষুধ
                  </h3>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 pr-4 -mr-4 pl-1">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <ProductCardSkeleton key={`freq-skel-${i}`} layout="frequent" />
                      ))
                    : frequentProducts.map(p => {
                    const inCartQty = cartQuantities[p.id] || 0;
                    const catTheme = getCategoryConfig(p.category);
                    return (
                      <div
                        key={p.id}
                        onClick={() => onOpenProductDetails(p)}
                        className="bg-white border border-slate-100/90 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:border-slate-200 cursor-pointer flex flex-col justify-between relative min-w-[145px] flex-shrink-0 transition-all"
                      >
                        {inCartQty > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-brand-purple text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10 shadow-xs animate-fade-in">
                            {inCartQty} টি কার্টে আছে
                          </span>
                        )}
                        <div>
                          <div className="w-full h-14 rounded-xl overflow-hidden bg-slate-50 border border-slate-100/80 mb-2 flex items-center justify-center p-1">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" />
                            ) : (
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center p-1.5 ${catTheme.bg} ${catTheme.text}`}>
                                <CategoryIcon name={p.category} className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between items-start mb-1">
                            <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-1.5 py-0.5 rounded">
                              {p.category}
                            </span>
                            <span className="text-[8.5px] text-slate-400 font-mono font-bold">{p.packSize}</span>
                          </div>
                          <h4 className="text-xs font-black text-brand-charcoal truncate">{p.name}</h4>
                          <p className="text-[9px] text-slate-400 uppercase font-bold truncate mt-0.5">{p.genericName}</p>
                        </div>
                        <div className="mt-3 flex justify-between items-center pt-2 border-t border-slate-50">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-brand-purple">৳{p.sellingPrice}</span>
                            <span className="text-[8px] text-slate-400 font-bold font-mono">{formatProductPriceLabel(p.sellingPrice, p.packSize)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (inCartQty > 0) {
                                onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, 1);
                              } else {
                                handleQuickBuy(p.id, 1, e, p.imageUrl || p.image_url);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                              successId === p.id
                                ? "bg-emerald-600 text-white scale-110 shadow-md"
                                : "bg-brand-lime text-slate-900 hover:bg-brand-lime-dark"
                            }`}
                          >
                            {successId === p.id ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

        {/* Today's Best Deals list */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-brand-purple" />
              আজকের সেরা পাইকারি ডিল
            </h3>
          </div>
          <div className="space-y-2.5">
            {isLoading 
              ? Array.from({ length: 3 }).map((_, i) => (
                  <ProductCardSkeleton key={`deal-skel-${i}`} layout="horizontal" />
                ))
              : bestDeals.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                layout="horizontal"
                cartQuantity={cartQuantities[p.id] || 0}
                onAddToCart={(productId, qty) => onAddToCart(productId, qty)}
                onUpdateCartQty={(productId, currentQty, delta) =>
                  onUpdateCartQty ? onUpdateCartQty(productId, currentQty, delta) : null
                }
                onOpenDetails={(product) => onOpenProductDetails(product)}
              />
            ))}
          </div>
        </div>

        {/* Highest Discount Products */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              সর্বোচ্চ পাইকারি সাশ্রয়ের ওষুধ
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={`discount-skel-${i}`} layout="grid" />
                ))
              : highestDiscounts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                layout="grid"
                cartQuantity={cartQuantities[p.id] || 0}
                onAddToCart={(productId, qty) => onAddToCart(productId, qty)}
                onUpdateCartQty={(productId, currentQty, delta) =>
                  onUpdateCartQty ? onUpdateCartQty(productId, currentQty, delta) : null
                }
                onOpenDetails={(product) => onOpenProductDetails(product)}
              />
            ))}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
