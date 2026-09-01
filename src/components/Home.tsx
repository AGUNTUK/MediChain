import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Flame,
  Mic,
  Camera,
  X,
  Building2,
  Percent,
  LayoutGrid,
  ListFilter,
  Award
} from "lucide-react";
import MediChainLogo from "./MediChainLogo";
import { Product, Order } from "../types";
import { productService } from "../services";
import NotificationBell from "./NotificationBell";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import ErrorState from "./ErrorState";
import { formatProductPriceLabel, toBengaliNumber } from "../lib/utils";
import { apiCache } from "../lib/apiCache";
import { useCartFeedback } from "../context/FlyToCartContext";
import PrescriptionScanner from "./PrescriptionScanner";
import HeroCarousel from "./HeroCarousel";
import CategoryIcon, { getCategoryConfig } from "./CategoryIcon";
import { ALL_CATEGORY_VALUES } from "../constants/categories";
import { useDebounce } from "../hooks/useDebounce";

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

// Top pharma manufacturers in Bangladesh
const TOP_MANUFACTURERS = [
  { name: "Square Pharmaceuticals PLC", shortName: "Square", color: "from-blue-600 to-indigo-700", badge: "শীর্ষ কোম্পানি" },
  { name: "Beximco Pharmaceuticals Ltd", shortName: "Beximco", color: "from-purple-600 to-indigo-800", badge: "গ্লোবাল স্ট্যান্ডার্ড" },
  { name: "Incepta Pharmaceuticals Ltd", shortName: "Incepta", color: "from-teal-600 to-emerald-700", badge: "সেরা গবেষণা" },
  { name: "The ACME Laboratories Ltd", shortName: "ACME", color: "from-amber-600 to-orange-700", badge: "বিশ্বস্ত মান" },
  { name: "Renata Limited", shortName: "Renata", color: "from-cyan-600 to-blue-700", badge: "প্রিমিয়াম কোয়ালিটি" },
  { name: "Opsonin Pharma Ltd", shortName: "Opsonin", color: "from-rose-600 to-red-700", badge: "জনপ্রিয়" },
  { name: "Healthcare Pharmaceuticals Ltd", shortName: "Healthcare", color: "from-emerald-600 to-teal-800", badge: "স্পেশালাইজড" },
  { name: "ACI Limited", shortName: "ACI", color: "from-red-600 to-rose-800", badge: "হেরিটেজ ব্র্যান্ড" },
  { name: "Eskayef Pharmaceuticals Ltd", shortName: "Eskayef", color: "from-indigo-600 to-violet-800", badge: "ইউএসএফডিএ সার্টিফায়েড" },
  { name: "Aristopharma Ltd", shortName: "Aristopharma", color: "from-violet-600 to-purple-800", badge: "সর্বোচ্চ কোয়ালিটি" },
  { name: "Radiant Pharmaceuticals Ltd", shortName: "Radiant", color: "from-sky-600 to-indigo-700", badge: "ইনোভেশন" },
  { name: "General Pharmaceuticals Ltd", shortName: "General Pharma", color: "from-pink-600 to-rose-700", badge: "দ্রুত বর্ধনশীল" }
];

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
  // Deals, frequent, discount states
  const [bestDeals, setBestDeals] = useState<Product[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [highestDiscounts, setHighestDiscounts] = useState<Product[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [liveCampaign, setLiveCampaign] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!apiCache.get("categories"));
  const [error, setError] = useState<string | null>(null);

  // Live Products Catalog on Home states
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [isListening, setIsListening] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState<"all" | "deals" | "frequent" | "low_stock">("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogTotalProducts, setCatalogTotalProducts] = useState(0);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [profitMarginRange, setProfitMarginRange] = useState<{ min: number; max: number }>({ min: 4, max: 94 });
  const [dailyBanner, setDailyBanner] = useState<{
    headline?: string;
    subheadline?: string;
    badgeText?: string;
    minDiscount: number;
    maxDiscount: number;
    avgDiscount?: number;
    totalProductsChecked?: number;
    lastUpdated?: string;
  }>({
    minDiscount: 4,
    maxDiscount: 94,
    headline: "আজকের পাইকারি অর্ডারে ৪% – ৯৪% পর্যন্ত নিশ্চিত লাভ!",
    subheadline: "কোনো মধ্যস্বত্বভোগী ছাড়াই সরাসরি প্রস্তুতকারক কোম্পানি থেকে সেরা মূল্যে ফার্মেসির ওষুধ অর্ডার করুন।",
    badgeText: "AI দৈনিক মুনাফা মিটার"
  });

  const DEFAULT_CATEGORIES = ALL_CATEGORY_VALUES;

  // Helper to ensure in-stock products always appear first
  const prioritizeInStock = (products: Product[]): Product[] => {
    return [...products].sort((a, b) => {
      const aInStock = (a.availableStock ?? 0) > 0 ? 1 : 0;
      const bInStock = (b.availableStock ?? 0) > 0 ? 1 : 0;
      if (aInStock !== bInStock) return bInStock - aInStock;
      return 0;
    });
  };

  // Helper to dynamically calculate lowest & highest discount % from in-stock items
  const updateProfitMarginFromInStock = (products: Product[]) => {
    const inStockWithDiscount = products.filter(
      p => (p.availableStock ?? 0) > 0 && (p.discountPercentage ?? 0) > 0
    );
    if (inStockWithDiscount.length > 0) {
      const discounts = inStockWithDiscount.map(p => Math.round(p.discountPercentage));
      const min = Math.min(...discounts);
      const max = Math.max(...discounts);
      if (min > 0 && max >= min) {
        setProfitMarginRange({ min, max });
      }
    }
  };

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
        setDbCategories(DEFAULT_CATEGORIES);
      }

      // 1. Fetch Deals
      const dataDeals = await productService.getProducts({ filter: "deals", limit: 60 });
      const inStockDeals = [...dataDeals].sort((a, b) => {
        const aInStock = (a.availableStock ?? 0) > 0 ? 1 : 0;
        const bInStock = (b.availableStock ?? 0) > 0 ? 1 : 0;
        if (aInStock !== bInStock) return bInStock - aInStock;
        return (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0);
      });
      setBestDeals(inStockDeals.slice(0, 3));
      setHighestDiscounts(inStockDeals.slice(0, 4));

      // 2. Fetch Frequently ordered
      const dataFreq = await productService.getProducts({ filter: "frequent", limit: 30 });
      const inStockFreq = [...dataFreq].sort((a, b) => {
        const aInStock = (a.availableStock ?? 0) > 0 ? 1 : 0;
        const bInStock = (b.availableStock ?? 0) > 0 ? 1 : 0;
        if (aInStock !== bInStock) return bInStock - aInStock;
        return (b.soldStock ?? 0) - (a.soldStock ?? 0);
      });
      setFrequentProducts(inStockFreq.slice(0, 4));

      // 3. Fetch Gemini AI Daily Profit Meter Analysis
      try {
        const bannerRes = await fetch("/api/banner/daily-profit-meter");
        if (bannerRes.ok) {
          const bannerJson = await bannerRes.json();
          if (bannerJson && bannerJson.minDiscount !== undefined && bannerJson.maxDiscount !== undefined) {
            setDailyBanner(bannerJson);
            setProfitMarginRange({ min: bannerJson.minDiscount, max: bannerJson.maxDiscount });
          }
        }
      } catch (bannerErr) {
        console.warn("Failed to fetch daily profit meter:", bannerErr);
      }

      // 4. Fetch Live Campaign
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

  // Fetch Live Catalog products for Homepage
  const fetchCatalogProducts = async (isNewQuery: boolean = false) => {
    try {
      if (isNewQuery) {
        setIsLoadingCatalog(true);
      }

      const currentPage = isNewQuery ? 1 : catalogPage;
      const effectiveSearch = selectedManufacturer 
        ? `${selectedManufacturer} ${debouncedSearch}`.trim()
        : debouncedSearch.trim();

      const response = await productService.getProductsPaginated({
        search: effectiveSearch || undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        filter: selectedFilter !== "all" ? selectedFilter : undefined,
        page: currentPage,
        limit: 24
      });

      const prioritizedList = prioritizeInStock(response.products);

      if (isNewQuery) {
        setCatalogProducts(prioritizedList);
        setCatalogPage(1);
      } else {
        setCatalogProducts(prev => {
          const newItems = prioritizedList.filter(p => !prev.some(e => e.id === p.id));
          return prioritizeInStock([...prev, ...newItems]);
        });
      }

      updateProfitMarginFromInStock(prioritizedList);
      setCatalogTotalProducts(response.total);
      setCatalogTotalPages(response.pages || 1);
    } catch (err) {
      console.error("Failed to load catalog products for home:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Reset page and refetch when query parameters change
  useEffect(() => {
    fetchCatalogProducts(true);
  }, [debouncedSearch, selectedCategory, selectedFilter, selectedManufacturer]);

  // Load more pagination on page change
  useEffect(() => {
    if (catalogPage > 1) {
      fetchCatalogProducts(false);
    }
  }, [catalogPage]);

  // Infinite scrolling observer ref
  const observer = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoadingCatalog) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && catalogPage < catalogTotalPages) {
        setCatalogPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoadingCatalog, catalogPage, catalogTotalPages]);

  // Voice search handler
  const handleVoiceSearch = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("ভয়েস সার্চের জন্য মাইক্রোফোন পারমিশন প্রয়োজন। অনুগ্রহ করে ব্রাউজার সেটিংসে মাইক্রোফোন অ্যালাও করুন।");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("এই ব্রাউজারে ভয়েস সার্চ সমর্থিত নয়।");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearch(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const { triggerCartFeedback, triggerButtonFeedback } = useCartFeedback();

  const displayCategoryNames = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...dbCategories
  ]));

  const visibleCategoryNames = showAllCategories ? displayCategoryNames : displayCategoryNames.slice(0, 12);

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col select-none overflow-y-auto">
      {/* Header Area */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2">
          <MediChainLogo size="sm" withText={true} textColor="dark" />
        </div>

        {/* Notifications and status */}
        <div className="flex items-center gap-2">
          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 relative cursor-pointer flex items-center justify-center border border-slate-200/40 transition-colors"
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
          <HeroCarousel 
            pharmacyName={pharmacyName} 
            onOpenScanner={() => setIsScannerOpen(true)} 
            onBrowseCatalog={() => {
              const el = document.getElementById("home-product-catalog");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }} 
            onOpenBulkDeals={onOpenBulkDeals} 
          />
          
          <div className="p-4 space-y-5 pb-32">
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

            {/* Smart Search Bar with Direct Voice & Camera Actions (Point 5) */}
            <div className="space-y-1.5">
              <div className="flex items-center bg-white border-2 border-slate-200/90 focus-within:border-brand-purple rounded-2xl px-3 py-2 shadow-xs transition-all gap-2">
                <Search className="text-slate-400 w-5 h-5 shrink-0" />
                
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="১০,০০০+ ওষুধ বা জেনেরিক নাম লিখে খুঁজুন..."
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Voice Search Button */}
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  title="ভয়েস সার্চ (মুখে বলে খুঁজুন)"
                  className={`p-1.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                    isListening
                      ? "bg-rose-500 text-white animate-pulse shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Camera SmartOrder Scanner Button */}
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  title="MediChain SmartOrder (Write it. Scan it. Cart it.)"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-emerald-500/20"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">SmartOrder</span>
                </button>
              </div>

              {isListening && (
                <div className="flex items-center gap-2 px-2 text-xs font-bold text-rose-600 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  বলুন... আপনার ওষুধের নাম শুনছি
                </div>
              )}
            </div>

            {isScannerOpen && (
              <PrescriptionScanner onClose={() => setIsScannerOpen(false)} />
            )}

            {/* MediChain SmartOrder Card (Write it. Scan it. Cart it.) */}
            <div className="bg-linear-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-emerald-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-radial from-emerald-400/15 to-transparent blur-2xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Sparkles className="w-3 h-3 text-slate-950" />
                      MediChain SmartOrder
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono font-bold">
                      Gemini 3.7 Flash Vision
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                    MediChain SmartOrder — <span className="text-emerald-300">Write it. Scan it. Cart it.</span>
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Handwritten medicine list scan করুন এবং কয়েক সেকেন্ডে verified products cart-এ যোগ করুন।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Camera className="w-4 h-4" />
                  <span>📷 SmartOrder স্ক্যানার</span>
                </button>
              </div>
            </div>

            {/* Wholesale Profit Margin Calculator Card (Point 4) - Gemini AI Daily Dynamic Meter */}
            <div className="bg-linear-to-r from-purple-950 via-indigo-900 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-purple-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-radial from-brand-lime/15 to-transparent blur-2xl pointer-events-none"></div>
              
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="bg-brand-lime text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3 text-slate-950" />
                    {dailyBanner.badgeText || "AI দৈনিক মুনাফা মিটার"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-brand-lime/90 font-mono font-bold flex items-center gap-1 bg-brand-lime/10 px-2 py-0.5 rounded-full border border-brand-lime/20">
                      <Sparkles className="w-3 h-3" />
                      Gemini AI ভেরিফাইড
                    </span>
                    <span className="text-[10px] text-purple-200 font-mono font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-brand-lime" />
                      সরাসরি প্রস্তুতকারক রেট
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                    {dailyBanner.headline ? (
                      dailyBanner.headline
                    ) : (
                      <>
                        আজকের পাইকারি অর্ডারে গড়ে{" "}
                        <span className="text-brand-lime font-mono">
                          {profitMarginRange.min === profitMarginRange.max
                            ? `${toBengaliNumber(profitMarginRange.max)}%`
                            : `${toBengaliNumber(profitMarginRange.min)}% – ${toBengaliNumber(profitMarginRange.max)}%`}
                        </span>{" "}
                        পর্যন্ত সর্বোচ্চ লাভ!
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-purple-200/90 font-medium mt-0.5">
                    {dailyBanner.subheadline || "মেডিচেইন ডিপো থেকে সরাসরি ক্রয়ে কোনো মধ্যস্বত্বভোগী নেই, তাই ফার্মেসির মুনাফা থাকে সর্বোচ্চ।"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFilter("deals");
                      const el = document.getElementById("home-product-catalog");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                      selectedFilter === "deals"
                        ? "bg-brand-lime text-slate-950 shadow-md"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-brand-lime" />
                    <span>সর্বোচ্চ লাভ (Deals)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFilter("frequent");
                      const el = document.getElementById("home-product-catalog");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                      selectedFilter === "frequent"
                        ? "bg-brand-lime text-slate-950 shadow-md"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-purple-300" />
                    <span>জনপ্রিয় ওষুধ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFilter("low_stock");
                      const el = document.getElementById("home-product-catalog");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                      selectedFilter === "low_stock"
                        ? "bg-brand-lime text-slate-950 shadow-md"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>কম স্টকের ওষুধ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Top Pharma Manufacturer Brand Carousel / Hub (Point 3) */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-0.5">
                <h3 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-purple" />
                  শীর্ষ প্রস্তুতকারক কোম্পানি ব্র্যান্ড হাব
                </h3>
                {selectedManufacturer && (
                  <button
                    type="button"
                    onClick={() => setSelectedManufacturer(null)}
                    className="text-[11px] font-black text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    ফিল্টার মুছুন
                  </button>
                )}
              </div>

              <div className="flex overflow-x-auto gap-2.5 pb-2 -mx-4 px-4 scrollbar-hide snap-x">
                {TOP_MANUFACTURERS.map(m => {
                  const isSelected = selectedManufacturer === m.name;
                  return (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => {
                        setSelectedManufacturer(isSelected ? null : m.name);
                        const el = document.getElementById("home-product-catalog");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`flex-shrink-0 snap-start flex flex-col justify-between p-3 min-w-[130px] rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-slate-900 text-white border-brand-lime shadow-lg scale-105"
                          : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-md"
                      }`}
                    >
                      <div className="space-y-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-block ${
                          isSelected ? "bg-brand-lime text-slate-950" : "bg-slate-100 text-slate-700"
                        }`}>
                          {m.badge}
                        </span>
                        <h4 className="text-xs sm:text-sm font-black truncate">{m.shortName}</h4>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs font-black">
                        <span className={isSelected ? "text-brand-lime" : "text-brand-purple"}>ওষুধ দেখুন</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Carousel Grid */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-0.5">
                <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-brand-purple" />
                  ওষুধের ধরন ও ক্যাটাগরি
                </h3>
                {displayCategoryNames.length > 12 && (
                  <button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="text-xs font-black text-brand-purple hover:underline cursor-pointer"
                  >
                    {showAllCategories ? "কম দেখুন" : "সব দেখুন"}
                  </button>
                )}
              </div>
              
              {showAllCategories ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
                  {visibleCategoryNames.map(name => {
                    const config = getCategoryConfig(name);
                    const isSelected = selectedCategory === name;
                    return (
                      <button
                        key={name}
                        onClick={() => {
                          setSelectedCategory(isSelected ? "All" : name);
                          const el = document.getElementById("home-product-catalog");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-50 border-brand-purple shadow-md scale-105"
                            : "bg-white border-slate-100/90 shadow-2xs hover:shadow-md hover:border-slate-200"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1.5 p-2.5 transition-transform ${config.bg} ${config.text} border ${config.border}`}>
                          <CategoryIcon name={name} className="w-5.5 h-5.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
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
                    const isSelected = selectedCategory === name;
                    return (
                      <button
                        key={name}
                        onClick={() => {
                          setSelectedCategory(isSelected ? "All" : name);
                          const el = document.getElementById("home-product-catalog");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`flex-shrink-0 snap-start flex flex-col items-center justify-center p-2.5 w-[90px] h-[96px] rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-50 border-brand-purple shadow-md scale-105"
                            : "bg-white border-slate-100/90 shadow-2xs hover:shadow-md hover:border-slate-200"
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-1.5 p-2.5 transition-transform ${config.bg} ${config.text} border ${config.border}`}>
                          <CategoryIcon name={name} className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
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
                      className="bg-white hover:bg-slate-100 text-brand-purple font-black text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-md group-hover:scale-105 transition-transform cursor-pointer"
                    >
                      <span>অফার দেখুন</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FULL LIVE PRODUCT CATALOG SECTION ON HOMEPAGE */}
            <div id="home-product-catalog" className="pt-2 space-y-4 scroll-mt-20">
              {/* Section Header with Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-brand-purple" />
                    ওষুধের সম্পূর্ণ পাইকারি ক্যাটালগ
                    <span className="text-sm text-slate-500 font-mono font-bold">({catalogTotalProducts.toLocaleString()} টি)</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    সরাসরি ডিপো ইনভেন্টরি থেকে লাইভ রেটে ওষুধ নির্বাচন করুন
                  </p>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-white border border-slate-200/80 p-1.5 rounded-2xl shrink-0 self-start sm:self-auto shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      viewMode === "grid" ? "bg-brand-purple text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="গ্রিড ভিউ"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      viewMode === "list" ? "bg-brand-purple text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="তালিকা ভিউ"
                  >
                    <ListFilter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Filter Badges */}
              {(selectedManufacturer || selectedCategory !== "All" || selectedFilter !== "all" || search) && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="text-xs text-slate-400 uppercase font-black tracking-wider">সক্রিয় ফিল্টার:</span>
                  
                  {selectedManufacturer && (
                    <span className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-xl">
                      কোম্পানি: {selectedManufacturer}
                      <button onClick={() => setSelectedManufacturer(null)} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}

                  {selectedCategory !== "All" && (
                    <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-900 px-2.5 py-1 rounded-xl">
                      ক্যাটাগরি: {selectedCategory}
                      <button onClick={() => setSelectedCategory("All")} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}

                  {selectedFilter !== "all" && (
                    <span className="inline-flex items-center gap-1.5 bg-lime-100 text-lime-950 px-2.5 py-1 rounded-xl">
                      ফিল্টার: {selectedFilter === "deals" ? "সর্বোচ্চ লাভ" : selectedFilter === "frequent" ? "জনপ্রিয়" : "কম স্টক"}
                      <button onClick={() => setSelectedFilter("all")} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}

                  {search && (
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl">
                      খোঁজা হচ্ছে: "{search}"
                      <button onClick={() => setSearch("")} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManufacturer(null);
                      setSelectedCategory("All");
                      setSelectedFilter("all");
                      setSearch("");
                    }}
                    className="text-xs font-black text-rose-600 hover:underline cursor-pointer ml-1"
                  >
                    সব রিসেট করুন
                  </button>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setSelectedFilter("all")}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer ${
                    selectedFilter === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  সব ওষুধ
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFilter("deals")}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedFilter === "deals"
                      ? "bg-brand-purple text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  <Flame className="w-4 h-4 text-amber-500" />
                  সর্বোচ্চ লাভ (ছাড়)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFilter("frequent")}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedFilter === "frequent"
                      ? "bg-brand-purple text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  জনপ্রিয় ওষুধ
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFilter("low_stock")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    selectedFilter === "low_stock"
                      ? "bg-brand-purple text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  কম স্টকের ওষুধ
                </button>
              </div>

              {/* Products Rendering Grid or Horizontal List */}
              {isLoadingCatalog && catalogProducts.length === 0 ? (
                <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3" : "space-y-2.5"}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ProductCardSkeleton key={`home-cat-skel-${i}`} layout={viewMode === "grid" ? "grid" : "horizontal"} />
                  ))}
                </div>
              ) : catalogProducts.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Package className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">কোনো ওষুধ পাওয়া যায়নি</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    আপনার নির্বাচিত ফিল্টার বা অনুসন্ধানের সাথে মিল রেখে কোনো ওষুধ পাওয়া যায়নি। ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManufacturer(null);
                      setSelectedCategory("All");
                      setSelectedFilter("all");
                      setSearch("");
                    }}
                    className="bg-brand-purple text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    সকল ফিল্টার মুছুন
                  </button>
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3" : "space-y-2.5"}>
                  {catalogProducts.map((product, idx) => {
                    const isLast = idx === catalogProducts.length - 1;
                    return (
                      <div
                        key={product.id}
                        ref={isLast ? lastProductElementRef : undefined}
                      >
                        <ProductCard
                          product={product}
                          layout={viewMode === "grid" ? "grid" : "horizontal"}
                          cartQuantity={cartQuantities[product.id] || 0}
                          onAddToCart={(id, qty) => onAddToCart(id, qty)}
                          onUpdateCartQty={(id, currentQty, delta) =>
                            onUpdateCartQty ? onUpdateCartQty(id, currentQty, delta) : null
                          }
                          onOpenDetails={(p) => onOpenProductDetails(p)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Loading More Indicator */}
              {isLoadingCatalog && catalogProducts.length > 0 && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-purple" />
                  আরও ওষুধ লোড হচ্ছে...
                </div>
              )}

              {/* End of catalog message */}
              {!isLoadingCatalog && catalogProducts.length > 0 && catalogPage >= catalogTotalPages && (
                <div className="text-center py-6 text-xs text-slate-400 font-bold">
                  ✓ সমস্ত ওষুধ প্রদর্শিত হয়েছে (মোট {catalogTotalProducts} টি)
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
