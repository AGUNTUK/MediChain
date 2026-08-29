import React, { useState, useEffect } from "react";
import { X, ShieldCheck, AlertCircle, Calendar, Truck, Layers, Coins, Bell, BellRing, Check, ArrowRight, Sparkles } from "lucide-react";
import { Product } from "../types";
import { formatProductPriceLabel } from "../lib/utils";
import { useCartFeedback } from "../context/FlyToCartContext";
import { productService } from "../services/product";

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
  const [hasRestockAlert, setHasRestockAlert] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;

    // Check restock alert subscription
    setHasRestockAlert(productService.hasRestockAlert(product.id));

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

  const handleToggleRestock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isSubscribed = productService.toggleRestockAlert(product.id);
    setHasRestockAlert(isSubscribed);

    if (isSubscribed) {
      setToastMessage("রিস্টক এলার্ট সেট হয়েছে! ডিপোতে নতুন স্টক আসামাত্র নোটিফিকেশন পাবেন।");
    } else {
      setToastMessage("রিস্টক এলার্ট বন্ধ করা হয়েছে।");
    }

    setTimeout(() => setToastMessage(null), 3500);
  };

  const profitMarginPercent = product.mrp > 0 && product.sellingPrice > 0
    ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
    : 0;

  const isOutOfStock = product.availableStock <= 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end z-50 select-none animate-fade-in">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2 animate-slide-down max-w-sm text-center">
          <Check className="w-4 h-4 text-brand-lime shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full bg-brand-bg rounded-t-3xl p-6 border-t border-slate-200 shadow-2xl overflow-y-auto max-h-[90%] animate-slide-up max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-brand-purple text-white font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                {product.category}
              </span>
              {profitMarginPercent > 0 && (
                <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  {profitMarginPercent}% Margin
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
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Product Image */}
        {product.imageUrl && (
          <div className="w-full h-40 bg-white rounded-2xl border border-slate-100 mb-4 overflow-hidden shadow-sm flex items-center justify-center p-2">
            <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain" />
          </div>
        )}

        {/* Corporate details */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 space-y-2 text-xs shadow-2xs">
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Manufacturer:</span>
            <span className="font-bold text-slate-800">{product.company}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Packaging Format:</span>
            <span className="font-mono font-bold text-slate-800">{product.packSize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">FEFO Expiry Date:</span>
            <span className="font-mono font-extrabold text-slate-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-purple" />
              {product.expiryDate}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Active Batch No:</span>
            <span className="font-mono font-bold text-brand-purple">{product.batchNumber}</span>
          </div>
        </div>

        {/* Inventory Stock Levels & Supply Chain Logic */}
        <div className="bg-slate-950/5 rounded-2xl p-4 border border-slate-100 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-purple" />
              Supply Chain & Depot Stock Ledger
            </h4>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
              isOutOfStock 
                ? "bg-rose-100 text-rose-700" 
                : product.availableStock <= 150 
                ? "bg-amber-100 text-amber-700" 
                : "bg-emerald-100 text-emerald-700"
            }`}>
              {isOutOfStock ? "Stock Out" : product.availableStock <= 150 ? "Low Depot Stock" : "In Stock"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center mb-1">
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[9px] text-slate-400 block font-mono font-semibold">Available</span>
              <span className={`text-sm font-black ${isOutOfStock ? "text-rose-600" : "text-brand-purple"}`}>
                {product.availableStock} Box
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[9px] text-slate-400 block font-mono font-semibold">Reserved</span>
              <span className="text-sm font-black text-slate-500">{product.reservedStock || 0} Box</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[9px] text-slate-400 block font-mono font-semibold">Sold Total</span>
              <span className="text-sm font-black text-brand-lime">{product.soldStock || 0} Box</span>
            </div>
          </div>
        </div>

        {/* Pricing details */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 text-center flex flex-col justify-center shadow-2xs">
            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">M.R.P. Box Price</span>
            <span className="text-base font-extrabold text-slate-400 line-through mt-1 block">৳{product.mrp}</span>
            <span className="text-[8px] text-slate-400 font-bold font-mono mt-0.5">{formatProductPriceLabel(product.mrp, product.packSize)}</span>
          </div>

          <div className="bg-brand-purple/5 p-3.5 rounded-2xl border border-brand-purple/20 text-center flex flex-col justify-center shadow-2xs">
            <span className="text-[9px] text-brand-purple block font-extrabold uppercase tracking-wider">MediChain Net Wholesale</span>
            <span className="text-lg font-black text-brand-purple mt-1 block">৳{product.sellingPrice}</span>
            <span className="text-[8px] text-brand-purple font-bold font-mono mt-0.5">{formatProductPriceLabel(product.sellingPrice, product.packSize)}</span>
          </div>
        </div>

        {/* High contrast Net Rebate savings pill */}
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-2.5 text-center text-xs font-bold mb-4 flex items-center justify-between shadow-3xs">
          <span>B2B Net Savings:</span>
          <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-black font-mono">
            Save ৳{product.mrp - product.sellingPrice} / Box ({profitMarginPercent}% Margin)
          </span>
        </div>

        {/* Smart Generic Alternative / Substitution Engine */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 shadow-2xs space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
              একই জেনেরিকের বিকল্প ব্র্যান্ডসমূহ (Generic Substitutes)
            </h4>
            <span className="text-[9px] text-slate-400 font-mono font-bold">
              {genericAlternatives.length} Alternatives
            </span>
          </div>

          {loadingAlternatives ? (
            <div className="py-3 text-center text-slate-400 text-xs">বিকল্প ব্র্যান্ড অনুসন্ধান করা হচ্ছে...</div>
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
                            {altMargin}% Margin
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-semibold">{alt.company}</span>
                        <span>•</span>
                        <span className="font-mono text-brand-purple font-black">৳{alt.sellingPrice} / Box</span>
                        <span>•</span>
                        <span className={alt.availableStock > 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                          {alt.availableStock > 0 ? `Stock: ${alt.availableStock}` : "Stock Out"}
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
                      + 1 Box
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Actions / Restock Notification Button */}
        {isOutOfStock ? (
          <div className="space-y-2">
            <button
              onClick={handleToggleRestock}
              className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                hasRestockAlert
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-brand-purple hover:bg-indigo-700 text-white shadow-brand-purple/20"
              }`}
            >
              {hasRestockAlert ? (
                <>
                  <BellRing className="w-4 h-4 text-brand-lime animate-bounce" />
                  <span>✓ রিস্টক এলার্ট সক্রিয় (Restock Alert Active)</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 text-brand-lime" />
                  <span>🔔 স্টকে আসলে নোটিফাই করুন (Notify When Restocked)</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center font-medium">
              ডিপোতে এই ওষুধের নতুন প্রস্তুতকারক লট আসামাত্র অ্যাপ আপনার নোটিফিকেশন সেন্টারে জানিয়ে দেবে।
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
              Select Bulk Order Size
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={(e) => handleQuickAdd(1, e)}
                className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-brand-purple p-3 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center gap-0.5 cursor-pointer shadow-2xs transition-all"
              >
                <span className="text-xs font-black">1 Box</span>
                <span className="text-[9px] text-slate-400 font-mono">৳{(1 * product.sellingPrice).toLocaleString()}</span>
              </button>

              <button
                onClick={(e) => handleQuickAdd(5, e)}
                className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-brand-purple p-3 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center gap-0.5 cursor-pointer shadow-2xs transition-all"
              >
                <span className="text-xs font-black">5 Boxes</span>
                <span className="text-[9px] text-slate-400 font-mono">৳{(5 * product.sellingPrice).toLocaleString()}</span>
              </button>

              <button
                onClick={(e) => handleQuickAdd(10, e)}
                className="bg-brand-purple text-white hover:bg-indigo-700 p-3 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5 cursor-pointer shadow-md transition-all"
              >
                <span className="text-xs font-black">10 Boxes</span>
                <span className="text-[9px] text-white/80 font-mono">৳{(10 * product.sellingPrice).toLocaleString()}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
