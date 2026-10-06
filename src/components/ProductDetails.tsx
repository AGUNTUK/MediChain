import React, { useState, useEffect, useMemo } from "react";
import { X, ShieldCheck, AlertCircle, Calendar, Truck, Layers, Coins, Sparkles, Plus, Minus, Check, Tag, ArrowRight } from "lucide-react";
import { Product, BulkTier } from "../types";
import { formatProductPriceLabel } from "../lib/utils";
import { useCartFeedback } from "../context/FlyToCartContext";
import { productService } from "../services/product";
import { bulkDealsService } from "../services/bulkDeals";
import StockAlertButton from "./StockAlertButton";

interface ProductDetailsProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (productId: string, qty: number) => void;
  onSelectProduct?: (product: Product) => void;
}

export default function ProductDetails({ product, onClose, onAddToCart, onSelectProduct }: ProductDetailsProps) {
  const { triggerCartFeedback, triggerButtonFeedback } = useCartFeedback();
  const [genericAlternatives, setGenericAlternatives] = useState<Product[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [productTiers, setProductTiers] = useState<BulkTier[]>([]);
  const [selectedQty, setSelectedQty] = useState<number>(1);

  useEffect(() => {
    if (!product) return;

    // 1. Resolve tiers from product or fetch from bulk deals service
    if (product.tiers && product.tiers.length > 0) {
      setProductTiers(product.tiers);
    } else {
      bulkDealsService.getProductTiers(product.id)
        .then(tiers => {
          if (tiers && tiers.length > 0) {
            setProductTiers(tiers);
          }
        })
        .catch(() => setProductTiers([]));
    }

    // 2. Fetch generic alternatives
    if (product.genericName) {
      setLoadingAlternatives(true);
      productService.getGenericAlternatives(product.genericName, product.id)
        .then(alts => setGenericAlternatives(alts))
        .catch(() => setGenericAlternatives([]))
        .finally(() => setLoadingAlternatives(false));
    } else {
      setGenericAlternatives([]);
    }
  }, [product?.id, product?.genericName]);

  // Sort tiers ascending by minQty
  const sortedTiers = useMemo(() => {
    return [...productTiers].sort((a, b) => a.minQty - b.minQty);
  }, [productTiers]);

  // Find active tier based on selected quantity
  const activeTier = useMemo(() => {
    if (sortedTiers.length === 0) return null;
    const sortedDesc = [...sortedTiers].sort((a, b) => b.minQty - a.minQty);
    return sortedDesc.find(t => selectedQty >= t.minQty) || null;
  }, [sortedTiers, selectedQty]);

  // Find next tier for encouragement
  const nextTier = useMemo(() => {
    if (sortedTiers.length === 0) return null;
    return sortedTiers.find(t => selectedQty < t.minQty) || null;
  }, [sortedTiers, selectedQty]);

  const maxDiscount = useMemo(() => {
    if (sortedTiers.length === 0) return 0;
    return Math.max(...sortedTiers.map(t => t.discountPercent));
  }, [sortedTiers]);

  if (!product) return null;

  const mrpPrice = Number(product.mrp) > 0 ? Number(product.mrp) : (Number(product.sellingPrice) || 0);
  const regularWholesalePrice = Number(product.sellingPrice) || mrpPrice;
  // Volume bulk tiers are calculated directly from MRP (e.g. 500 - 73% = 135)
  const effectiveUnitPrice = activeTier
    ? Math.round((mrpPrice * (1 - activeTier.discountPercent / 100)) * 100) / 100
    : regularWholesalePrice;

  const orderSubtotal = Math.round((effectiveUnitPrice * selectedQty) * 100) / 100;
  const totalSavings = Math.max(0, Math.round(((mrpPrice * selectedQty) - orderSubtotal) * 100) / 100);
  const tierSavings = activeTier ? Math.max(0, Math.round(((regularWholesalePrice - effectiveUnitPrice) * selectedQty) * 100) / 100) : 0;

  const handleQuickAdd = (qty: number, e?: React.MouseEvent<HTMLElement>) => {
    triggerCartFeedback();
    triggerButtonFeedback(product.id);
    onAddToCart(product.id, qty);
    onClose();
  };

  const handleQtyChange = (delta: number) => {
    setSelectedQty(prev => Math.max(1, prev + delta));
  };

  const profitMarginPercent = product.mrp > 0 && effectiveUnitPrice > 0
    ? Math.round(((product.mrp - effectiveUnitPrice) / product.mrp) * 100)
    : 0;

  const isOutOfStock = (product.availableStock ?? 0) <= 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[70] select-none animate-fade-in">
      {/* Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-brand-bg rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[85vh] animate-slide-up flex flex-col z-10">
        {/* Header */}
        <div className="flex justify-between items-start p-5 sm:p-6 pb-3 border-b border-slate-100 bg-white/80 backdrop-blur-xs shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-brand-purple text-white font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                {product.category}
              </span>
              {profitMarginPercent > 0 && (
                <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  {profitMarginPercent}% মোট লাভ
                </span>
              )}
              {sortedTiers.length > 0 && (
                <span className="text-[9px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-2.5 h-2.5" />
                  বাল্ক ডিল সক্রিয়
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-brand-charcoal mt-1.5 flex items-center gap-1.5">
              {product.name} <span className="text-xs font-bold text-slate-500">{product.strength}</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
              {product.genericName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Product Image */}
          {product.imageUrl && (
            <div className="w-full h-40 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs flex items-center justify-center p-2">
              <img src={product.imageUrl} alt={product.name} loading="lazy" className="max-w-full max-h-full object-contain" />
            </div>
          )}

          {/* Corporate details */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-2 text-xs shadow-2xs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">প্রস্তুতকারক কোম্পানি:</span>
              <span className="font-bold text-slate-800">{product.company}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">প্যাকেটের সাইজ:</span>
              <span className="font-mono font-bold text-slate-800">{product.packSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">ওষুধের মেয়াদ (FEFO):</span>
              <span className="font-mono font-extrabold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-purple" />
                {product.expiryDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">উৎপাদন ব্যাচ নং:</span>
              <span className="font-mono font-bold text-brand-purple">{product.batchNumber}</span>
            </div>
          </div>

          {/* Inventory Stock Levels & Supply Chain Logic */}
          <div className="bg-slate-950/5 rounded-2xl p-4 border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-purple" />
                ডিপো স্টক ও লট হিসাব
              </h4>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                isOutOfStock 
                  ? "bg-rose-100 text-rose-700" 
                  : product.availableStock <= 150 
                  ? "bg-amber-100 text-amber-700" 
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                {isOutOfStock ? "স্টক শেষ" : product.availableStock <= 150 ? "কম মজুদ" : "স্টকে আছে"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-1">
              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[9px] text-slate-400 block font-mono font-semibold">মজুদ আছে</span>
                <span className={`text-sm font-black ${isOutOfStock ? "text-rose-600" : "text-brand-purple"}`}>
                  {isOutOfStock ? 0 : (product.availableStock ?? 0)} বক্স
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[9px] text-slate-400 block font-mono font-semibold">রিজার্ভড</span>
                <span className="text-sm font-black text-slate-500">{product.reservedStock || 0} বক্স</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[9px] text-slate-400 block font-mono font-semibold">মোট বিক্রি</span>
                <span className="text-sm font-black text-brand-lime">{product.soldStock || 0} বক্স</span>
              </div>
            </div>
          </div>

          {/* Pricing Details Banner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 text-center flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">খুচরা মূল্য (MRP)</span>
              <span className="text-base font-extrabold text-slate-400 line-through mt-1 block">৳{product.mrp}</span>
              <span className="text-[8px] text-slate-400 font-bold font-mono mt-0.5">{formatProductPriceLabel(product.mrp, product.packSize)}</span>
            </div>

            <div className={`p-3.5 rounded-2xl border text-center flex flex-col justify-center shadow-2xs transition-all ${
              activeTier 
                ? "bg-gradient-to-br from-purple-50 to-indigo-50/70 border-brand-purple/40 ring-1 ring-brand-purple/20" 
                : "bg-brand-purple/5 border-brand-purple/20"
            }`}>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[9px] text-brand-purple block font-extrabold uppercase tracking-wider">
                  মেডিচেইন পাইকারি রেট
                </span>
                {activeTier && (
                  <span className="text-[8px] bg-brand-purple text-white font-black px-1.5 py-0.2 rounded-full">
                    {activeTier.discountPercent}% ছাড়
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-center gap-1.5 mt-1">
                {activeTier && (
                  <span className="text-xs font-bold text-slate-400 line-through font-mono">
                    ৳{product.sellingPrice}
                  </span>
                )}
                <span className="text-xl font-black text-brand-purple font-mono">
                  ৳{effectiveUnitPrice.toFixed(2)}
                </span>
              </div>
              <span className="text-[8px] text-brand-purple font-bold font-mono mt-0.5">
                {formatProductPriceLabel(effectiveUnitPrice, product.packSize)}
              </span>
            </div>
          </div>

          {/* High contrast Net Rebate savings pill */}
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-2.5 text-center text-xs font-bold flex items-center justify-between shadow-3xs">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>মোট লাভ / সাশ্রয়:</span>
            </span>
            <div className="flex items-center gap-2">
              {activeTier && tierSavings > 0 && (
                <span className="bg-purple-100 text-brand-purple px-2 py-0.5 rounded-md text-[9px] font-black font-mono">
                  বাল্ক বোনাস ৳{(regularWholesalePrice - effectiveUnitPrice).toFixed(2)}
                </span>
              )}
              <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-black font-mono">
                সাশ্রয় ৳{(product.mrp - effectiveUnitPrice).toFixed(2)} / বক্স ({profitMarginPercent}% লাভ)
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VOLUME BULK DISCOUNT TIERS SHOWCASE (Primary Tier System) */}
          {/* ========================================================================= */}
          {sortedTiers.length > 0 && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-purple-200/80 shadow-md space-y-3 relative overflow-hidden">
              {/* Decorative top accent gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600" />

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-brand-purple flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4 text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                      ভলিউম পাইকারি টিয়ার রেট (MRP ভিত্তিক ছাড়)
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      MRP ৳{mrpPrice} থেকে সরাসরি পার্সেন্টেজ ছাড় প্রযোজ্য হবে
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-purple-100 text-brand-purple font-black px-2.5 py-1 rounded-full border border-purple-200 uppercase tracking-wider">
                  সর্বোচ্চ {maxDiscount}% পর্যন্ত ছাড়
                </span>
              </div>

              {/* Tiers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {sortedTiers.map((tier, idx) => {
                  const isActive = activeTier?.minQty === tier.minQty;
                  // Volume bulk tier discount is calculated directly from MRP (e.g. 500 - 73% = 135)
                  const tierUnitPrice = Math.round((mrpPrice * (1 - tier.discountPercent / 100)) * 100) / 100;
                  const tierSubtotal = Math.round(tierUnitPrice * tier.minQty * 100) / 100;
                  const perBoxSave = Math.max(0, Math.round((regularWholesalePrice - tierUnitPrice) * 100) / 100);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedQty(tier.minQty)}
                      className={`text-left p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isActive
                          ? "bg-purple-50/90 border-brand-purple shadow-sm ring-2 ring-brand-purple/20"
                          : "bg-slate-50/70 hover:bg-purple-50/40 border-slate-200/80 hover:border-purple-200"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute -top-2.5 right-2 bg-brand-purple text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          সক্রিয় টিয়ার
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-slate-900 font-mono">
                            {tier.minQty}+ বক্স
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950">
                            {tier.discountPercent}% ছাড়
                          </span>
                        </div>

                        <div className="mt-2 flex items-baseline gap-1.5">
                          <span className="text-sm font-black text-brand-purple font-mono">
                            ৳{tierUnitPrice.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 line-through font-mono">
                            MRP ৳{mrpPrice}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">/বক্স</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">
                          {tier.minQty} বক্স = <strong className="font-mono text-slate-900 font-bold">৳{tierSubtotal.toLocaleString()}</strong>
                        </span>
                        {perBoxSave > 0 && (
                          <span className="text-emerald-600 font-bold font-mono">
                            -৳{perBoxSave}/বক্স বোনাস
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Next Tier Nudge or Active Celebration */}
              {nextTier ? (
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-medium">
                      আর <strong className="font-black text-amber-950 font-mono">{nextTier.minQty - selectedQty}টি</strong> বক্স যোগ করলেই <strong className="font-black text-brand-purple font-mono">{nextTier.discountPercent}%</strong> ছাড় পাবেন!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedQty(nextTier.minQty)}
                    className="shrink-0 bg-amber-200 hover:bg-amber-300 text-amber-950 font-black text-[10px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    + {nextTier.minQty - selectedQty} যোগ করুন
                  </button>
                </div>
              ) : activeTier ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-900">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                  <span className="text-[11px] font-bold">
                    অভিনন্দন! আপনি সর্বোচ্চ পাইকারি টিয়ার ছাড় (<span className="text-emerald-700 font-mono">{activeTier.discountPercent}% OFF</span>) আনলক করেছেন!
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Smart Generic Alternative / Substitution Engine */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
                💡 একই ফর্মুলার বিকল্প কোম্পানির ওষুধসমূহ
              </h4>
              <span className="text-[9px] text-slate-400 font-mono font-bold">
                {genericAlternatives.length} টি বিকল্প
              </span>
            </div>

            {loadingAlternatives ? (
              <div className="py-3 text-center text-slate-400 text-xs font-semibold">বিকল্প ব্র্যান্ড অনুসন্ধান করা হচ্ছে...</div>
            ) : genericAlternatives.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">এই মুহূর্তে ডিপোতে একই ফর্মুলার অন্য কোনো বিকল্প নেই।</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {genericAlternatives.map(alt => {
                  const altMargin = alt.mrp > 0 && alt.sellingPrice > 0
                    ? Math.round(((alt.mrp - alt.sellingPrice) / alt.mrp) * 100)
                    : 0;

                  return (
                    <div
                      key={alt.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-brand-purple/30 hover:shadow-2xs transition-all flex items-center justify-between gap-2"
                    >
                      <div 
                        onClick={() => onSelectProduct ? onSelectProduct(alt) : null}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-800 truncate">{alt.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold">{alt.strength}</span>
                          {altMargin > 0 && (
                            <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.2 rounded">
                              {altMargin}% লাভ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-semibold">{alt.company}</span>
                          <span>•</span>
                          <span className="font-mono text-brand-purple font-black">৳{alt.sellingPrice} / বক্স</span>
                          <span>•</span>
                          <span className={alt.availableStock > 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                            {alt.availableStock > 0 ? `মজুদ: ${alt.availableStock}` : "স্টকে নেই"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={alt.availableStock <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(alt.id, 1);
                          triggerCartFeedback();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all shrink-0 cursor-pointer ${
                          alt.availableStock > 0
                            ? "bg-brand-lime hover:bg-brand-lime-dark text-slate-950 shadow-2xs hover:scale-105"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        + ১ বক্স
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Order Actions / Stock Alert Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-100 rounded-b-none sm:rounded-b-3xl shadow-lg z-10 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))]">
          {isOutOfStock ? (
            <div className="space-y-2">
              <p className="text-[11px] text-amber-900 font-bold leading-relaxed">
                বর্তমানে স্টক শেষ। নতুন স্টক আসার তাৎক্ষণিক নোটিফিকেশন পেতে 'স্টক এলার্ট' বাটনে ট্যাপ করুন।
              </p>
              <StockAlertButton productId={product.id} productName={product.name} />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stepper and Quantity Selector */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-slate-700">পরিমাণ:</span>
                  <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(-1)}
                      className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:text-rose-600 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-12 text-center text-xs font-black text-slate-900 font-mono bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQtyChange(1)}
                      className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:text-brand-purple flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">বক্স</span>
                </div>

                {/* Quick Presets based on tiers */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedQty(1)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedQty === 1
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    ১টি
                  </button>

                  {sortedTiers.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedQty(t.minQty)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer font-mono whitespace-nowrap ${
                        selectedQty === t.minQty
                          ? "bg-brand-purple text-white border-brand-purple shadow-xs"
                          : "bg-purple-50 text-brand-purple border-purple-200 hover:bg-purple-100"
                      }`}
                    >
                      {t.minQty}টি (-{t.discountPercent}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtotal preview & Action Button */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">মোট:</span>
                    <span className="text-base sm:text-lg font-black text-brand-purple font-mono">
                      ৳{orderSubtotal.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium">
                    {selectedQty} বক্স @ ৳{effectiveUnitPrice.toFixed(2)}/বক্স
                    {tierSavings > 0 && (
                      <span className="text-emerald-600 font-bold ml-1">
                        (সাশ্রয় ৳{tierSavings.toLocaleString()})
                      </span>
                    )}
                  </p>
                </div>

                <button
                  onClick={(e) => handleQuickAdd(selectedQty, e)}
                  className="flex-1 max-w-[220px] py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-brand-purple hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-98"
                >
                  <span>কার্টে যোগ করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
