import React, { useState, useEffect } from "react";
import { X, ShieldCheck, AlertCircle, Calendar, Truck, Layers, Coins, Sparkles } from "lucide-react";
import { Product } from "../types";
import { formatProductPriceLabel } from "../lib/utils";
import { useCartFeedback } from "../context/FlyToCartContext";
import { productService } from "../services/product";
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

  useEffect(() => {
    if (!product) return;

    // Fetch generic alternatives
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

  if (!product) return null;

  const handleQuickAdd = (qty: number, e?: React.MouseEvent<HTMLElement>) => {
    triggerCartFeedback();
    triggerButtonFeedback(product.id);
    onAddToCart(product.id, qty);
    onClose();
  };

  const profitMarginPercent = product.mrp > 0 && product.sellingPrice > 0
    ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
    : 0;

  const isOutOfStock = product.availableStock <= 0;

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
                  {profitMarginPercent}% লাভ
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
              <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain" />
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
                  {product.availableStock} বক্স
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

          {/* Pricing details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 text-center flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">খুচরা মূল্য (MRP)</span>
              <span className="text-base font-extrabold text-slate-400 line-through mt-1 block">৳{product.mrp}</span>
              <span className="text-[8px] text-slate-400 font-bold font-mono mt-0.5">{formatProductPriceLabel(product.mrp, product.packSize)}</span>
            </div>

            <div className="bg-brand-purple/5 p-3.5 rounded-2xl border border-brand-purple/20 text-center flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] text-brand-purple block font-extrabold uppercase tracking-wider">মেডিচেইন পাইকারি রেট</span>
              <span className="text-lg font-black text-brand-purple mt-1 block">৳{product.sellingPrice}</span>
              <span className="text-[8px] text-brand-purple font-bold font-mono mt-0.5">{formatProductPriceLabel(product.sellingPrice, product.packSize)}</span>
            </div>
          </div>

          {/* High contrast Net Rebate savings pill */}
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-2.5 text-center text-xs font-bold flex items-center justify-between shadow-3xs">
            <span>মোট লাভ / সাশ্রয়:</span>
            <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-black font-mono">
              সাশ্রয় ৳{product.mrp - product.sellingPrice} / বক্স ({profitMarginPercent}% লাভ)
            </span>
          </div>

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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                  অর্ডারের পরিমাণ নির্বাচন করুন
                </span>
                <span className="text-[10px] font-bold text-brand-purple font-mono">
                  একক পাইকারি রেট: ৳{product.sellingPrice}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  onClick={(e) => handleQuickAdd(1, e)}
                  className="bg-white hover:bg-purple-50 border border-slate-200 hover:border-brand-purple p-2.5 sm:p-3 rounded-2xl text-xs font-bold text-slate-800 flex flex-col items-center gap-0.5 cursor-pointer shadow-2xs hover:shadow-xs transition-all active:scale-95"
                >
                  <span className="text-xs font-black text-slate-900">১ বক্স</span>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">৳{(1 * product.sellingPrice).toLocaleString()}</span>
                </button>

                <button
                  onClick={(e) => handleQuickAdd(5, e)}
                  className="bg-white hover:bg-purple-50 border border-slate-200 hover:border-brand-purple p-2.5 sm:p-3 rounded-2xl text-xs font-bold text-slate-800 flex flex-col items-center gap-0.5 cursor-pointer shadow-2xs hover:shadow-xs transition-all active:scale-95"
                >
                  <span className="text-xs font-black text-slate-900">৫ বক্স</span>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">৳{(5 * product.sellingPrice).toLocaleString()}</span>
                </button>

                <button
                  onClick={(e) => handleQuickAdd(10, e)}
                  className="bg-brand-purple text-white hover:bg-indigo-700 p-2.5 sm:p-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-0.5 cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  <span className="text-xs font-black">১০ বক্স</span>
                  <span className="text-[10px] text-white/90 font-mono font-bold">৳{(10 * product.sellingPrice).toLocaleString()}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
