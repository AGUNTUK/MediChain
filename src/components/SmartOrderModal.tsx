import React, { useState, useRef } from "react";
import { 
  Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, X, Plus, Minus, 
  ShoppingCart, Search, RefreshCw, Layers, ArrowRight, ShieldCheck, 
  HelpCircle, Eye, ChevronDown, Check, Zap, Info, RotateCcw
} from "lucide-react";
import { smartOrderService } from "../services/smartOrder";
import { MatchedSmartOrderItem } from "../lib/productMatcher";
import { Product } from "../types";

interface SmartOrderModalProps {
  onClose: () => void;
  onOpenCart?: () => void;
}

/**
 * Client-side compression and normalization for prescription image before OCR upload.
 */
function compressImageForOCR(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.88);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function SmartOrderModal({ onClose, onOpenCart }: SmartOrderModalProps) {
  // Image & Scan State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>("বিশ্লেষণ শুরু হচ্ছে...");
  const [items, setItems] = useState<MatchedSmartOrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>("");

  // Review & Edit State
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchingReplacements, setIsSearchingReplacements] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Carting State
  const [isCarting, setIsCarting] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsScanning(true);
      setScanStep("ছবি প্রসেসিং ও অপটিমাইজ করা হচ্ছে...");
      const compressed = await compressImageForOCR(file);
      setImagePreview(compressed);
      await executeScan(compressed);
    } catch (err: any) {
      setError(err.message || "ছবিটি লোড করতে সমস্যা হয়েছে। অন্য ছবি দিয়ে চেষ্টা করুন।");
      setIsScanning(false);
    }
  };

  const executeScan = async (base64Data: string) => {
    setIsScanning(true);
    setError(null);
    setCartSuccess(false);

    try {
      setScanStep("Gemini 3.7 Flash দিয়ে হাতের লেখা পড়া হচ্ছে...");
      
      const res = await smartOrderService.scanSmartOrder(base64Data);
      
      if (!res.success || !res.items || res.items.length === 0) {
        setError(res.error || "প্রেসক্রিপশন বা স্লিপে কোনো ওষুধের নাম শনাক্ত করা যায়নি। অনুগ্রহ করে পরিষ্কার ও ভালো আলোতে তোলা ছবি দিন।");
        setIsScanning(false);
        return;
      }

      setModelUsed(res.modelUsed || "gemini-3.7-flash");
      setItems(res.items);

      // Initialize selection and quantities
      const initialSelected = new Set<number>();
      const initialQty: Record<number, number> = {};

      res.items.forEach((item, idx) => {
        initialQty[idx] = Math.max(1, item.quantity || 1);
        // Pre-select if Strong Match or Good Match AND in stock
        if (item.matchedProduct && !item.isOutOfStock && item.matchConfidence >= 85) {
          initialSelected.add(idx);
        }
      });

      setSelectedIndices(initialSelected);
      setQuantities(initialQty);
    } catch (err: any) {
      setError(err.message || "প্রেসক্রিপশন স্ক্যান করতে সমস্যা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleItemSelection = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const updateItemQuantity = (idx: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[idx] || 1;
      const updated = Math.max(1, current + delta);
      return { ...prev, [idx]: updated };
    });
  };

  const handleSwapProduct = (idx: number, newProduct: Product) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = copy[idx];
      copy[idx] = {
        ...current,
        matchedProduct: newProduct,
        matchConfidence: 100,
        matchTier: "Strong Match",
        matchReason: ["User Manually Selected (+100)"],
        isOutOfStock: (newProduct.availableStock ?? 0) <= 0,
        isConfirmed: true
      };
      return copy;
    });

    // Auto select this item if in stock
    if ((newProduct.availableStock ?? 0) > 0) {
      setSelectedIndices((prev) => new Set(prev).add(idx));
    }

    setActiveSearchIndex(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearchQueryChange = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingReplacements(true);
    try {
      const prods = await smartOrderService.searchReplacementProducts(q);
      setSearchResults(prods);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSearchingReplacements(false);
    }
  };

  const handleCartAll = async () => {
    const selectedList: Array<{ productId: string; quantity: number }> = [];

    selectedIndices.forEach((idx) => {
      const item = items[idx];
      if (item && item.matchedProduct && item.matchedProduct.id) {
        selectedList.push({
          productId: item.matchedProduct.id,
          quantity: quantities[idx] || 1
        });
      }
    });

    if (selectedList.length === 0) {
      alert("কার্টে যোগ করার জন্য অন্তত একটি ওষুধ নির্বাচন করুন।");
      return;
    }

    setIsCarting(true);
    try {
      await smartOrderService.batchAddToCart(selectedList);
      window.dispatchEvent(new Event("cartUpdated"));
      setCartSuccess(true);
      
      setTimeout(() => {
        onClose();
        if (onOpenCart) {
          onOpenCart();
        }
      }, 1200);
    } catch (err: any) {
      alert(err.message || "কার্টে যোগ করতে সমস্যা হয়েছে।");
    } finally {
      setIsCarting(false);
    }
  };

  // Calculate Subtotals
  const selectedCount = selectedIndices.size;
  let totalMrp = 0;
  let totalSelling = 0;

  selectedIndices.forEach((idx) => {
    const it = items[idx];
    if (it && it.matchedProduct) {
      const q = quantities[idx] || 1;
      totalMrp += (it.matchedProduct.mrp || 0) * q;
      totalSelling += (it.matchedProduct.sellingPrice || it.matchedProduct.mrp || 0) * q;
    }
  });

  const totalSavings = Math.max(0, totalMrp - totalSelling);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* --- Top Header --- */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  MediChain <span className="text-emerald-400">SmartOrder</span>
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AI 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Write it. Scan it. Cart it. • <span className="text-emerald-300 font-medium">হাতের লেখার প্রেসক্রিপশন ও অর্ডার স্ক্যানার</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- Body Container --- */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* 1. UPLOAD / CAPTURE VIEW (Initial State) */}
          {!imagePreview && !isScanning && items.length === 0 && (
            <div className="py-6 sm:py-8 space-y-6 max-w-xl mx-auto text-center">
              
              <div className="p-8 border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-850/60 rounded-3xl transition-all duration-300 group hover:shadow-xl hover:shadow-emerald-500/10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2">
                  প্রেসক্রিপশন বা অর্ডারের ছবি আপলোড করুন
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
                  খাতায় লেখা ওষুধের অর্ডার স্লিপ বা ডাক্তারের প্রেসক্রিপশনের ছবি দিন। AI স্বয়ংক্রিয়ভাবে পড়ে ভেরিফায়েড পাইকারি কার্ট তৈরি করবে।
                </p>

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    সরাসরি ছবি তুলুন (Camera)
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    গ্যালারি থেকে বেছে নিন
                  </button>
                </div>
              </div>

              {/* Accuracy Tips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-300 leading-snug">
                    <strong>উজ্জ্বল আলো:</strong> ছায়ামুক্ত ও স্পষ্ট আলোতে ছবি তুললে ১০০% সঠিক রেজাল্ট পাওয়া যায়।
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-300 leading-snug">
                    <strong>২১k+ ম্যাচিং:</strong> স্কয়ার, বেক্সিমকো, ইনসেপ্টাসহ সব ব্র্যান্ডের আসল ডেটাবেজে ভেরিফাই হয়।
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-start gap-2.5">
                  <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-300 leading-snug">
                    <strong>রিভিউ ও এডিট:</strong> কার্টে যাওয়ার আগে যে কোনো ওষুধ বদলানো বা পরিমাণ এডিট করা যায়।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. SCANNING & PROCESSING ANIMATION */}
          {isScanning && (
            <div className="py-12 space-y-6 text-center max-w-md mx-auto animate-fadeIn">
              <div className="relative w-28 h-28 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                <div className="relative w-28 h-28 rounded-3xl bg-slate-850 border border-emerald-500/40 flex items-center justify-center shadow-2xl overflow-hidden">
                  <Sparkles className="w-10 h-10 text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
                  {/* Laser Beam Animation */}
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white mb-2">
                  MediChain SmartOrder স্ক্যান চলছে...
                </h3>
                <p className="text-sm font-medium text-emerald-400 animate-pulse">
                  {scanStep}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  হাতের লেখা ডিকোড করে ২১,০০০+ ওষুধের ক্যাটালগ সার্চ করা হচ্ছে
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 animate-fadeIn">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 text-xs sm:text-sm leading-relaxed">
                {error}
              </div>
              <button 
                onClick={() => { setError(null); setImagePreview(null); setItems([]); }}
                className="text-xs px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-200"
              >
                আবার ছবি তুলুন
              </button>
            </div>
          )}

          {/* 3. REVIEW & VERIFICATION SCREEN */}
          {!isScanning && items.length > 0 && (
            <div className="space-y-6">
              
              {/* Summary Status Strip */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-850 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-slate-200">
                    শনাক্তকৃত ওষুধ: <strong className="text-emerald-400 font-bold">{items.length} টি</strong>
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">
                    কার্টের জন্য নির্বাচিত: <strong className="text-white">{selectedCount} টি</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {imagePreview && (
                    <button
                      onClick={() => setShowImagePreview(!showImagePreview)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      {showImagePreview ? "ছবি লুকান" : "মূল স্লিপ দেখুন"}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setItems([]);
                      setSelectedIndices(new Set());
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    নতুন স্ক্যান
                  </button>
                </div>
              </div>

              {/* Collapsible Scanned Slip Image Viewer */}
              {showImagePreview && imagePreview && (
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden text-center animate-fadeIn">
                  <p className="text-[11px] text-slate-400 mb-2 font-medium">আসল প্রেসক্রিপশন / অর্ডার স্লিপ প্রিভিউ</p>
                  <img
                    src={imagePreview}
                    alt="Prescription Slip"
                    className="max-h-60 mx-auto rounded-xl object-contain border border-slate-800"
                  />
                </div>
              )}

              {/* Items Card List */}
              <div className="space-y-3.5">
                {items.map((item, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  const qty = quantities[idx] || item.quantity || 1;
                  const isSwapping = activeSearchIndex === idx;

                  // Badge Color & Text by Match Confidence Tier
                  let badgeBg = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                  let tierText = "Strong Match (৯৮%)";
                  if (item.matchTier === "Good Match") {
                    badgeBg = "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
                    tierText = `Good Match (${item.matchConfidence}%)`;
                  } else if (item.matchTier === "Possible Match") {
                    badgeBg = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                    tierText = `Review Recommended (${item.matchConfidence}%)`;
                  } else if (item.matchTier === "Low Confidence" || !item.matchedProduct) {
                    badgeBg = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                    tierText = `Manual Check Required (${item.matchConfidence}%)`;
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all duration-200 ${
                        isSelected 
                          ? "bg-slate-850/90 border-emerald-500/50 shadow-md shadow-emerald-950/20" 
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-80"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        
                        {/* Checkbox & Details */}
                        <div className="flex items-start gap-3 w-full sm:w-auto flex-1">
                          <button
                            onClick={() => toggleItemSelection(idx)}
                            disabled={!item.matchedProduct || item.isOutOfStock}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-1 transition-all ${
                              isSelected
                                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                                : "border border-slate-700 bg-slate-800/80 text-transparent hover:border-slate-600"
                            } ${(!item.matchedProduct || item.isOutOfStock) ? "opacity-30 cursor-not-allowed" : ""}`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            {/* Raw OCR Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono border border-slate-700">
                                OCR: "{item.rawText}"
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                {tierText}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                OCR নিশ্চিততা: {Math.round(item.ocrConfidence * 100)}%
                              </span>
                            </div>

                            {/* Matched Product Title & Info */}
                            {item.matchedProduct ? (
                              <div>
                                <div className="flex flex-wrap items-baseline gap-2">
                                  <h4 className="text-base font-bold text-white tracking-tight">
                                    {item.matchedProduct.name}
                                  </h4>
                                  <span className="text-xs text-slate-400 font-medium">
                                    {item.matchedProduct.company}
                                  </span>
                                  {item.matchedProduct.strength && (
                                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-semibold">
                                      {item.matchedProduct.strength}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-400 mt-0.5">
                                  জেনেরিক: <span className="text-slate-300">{item.matchedProduct.genericName}</span> • প্যাক: {item.matchedProduct.packSize}
                                </p>

                                {/* Stock & Wholesale Price */}
                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs">
                                  {item.isOutOfStock ? (
                                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                                      ⚠️ স্টক শেষ (Out of Stock)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                                      ✓ ডিপো স্টক অ্যাভেইলেবল ({item.matchedProduct.availableStock} বক্স)
                                    </span>
                                  )}

                                  <span className="font-bold text-emerald-300 text-sm">
                                    ৳{(item.matchedProduct.sellingPrice || item.matchedProduct.mrp).toLocaleString()}
                                  </span>
                                  {item.matchedProduct.mrp > item.matchedProduct.sellingPrice && (
                                    <span className="text-slate-500 line-through text-[11px]">
                                      MRP ৳{item.matchedProduct.mrp}
                                    </span>
                                  )}
                                  {item.matchedProduct.discountPercentage > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                      {item.matchedProduct.discountPercentage}% লাভ
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                                এই নামের কোনো ওষুধ ক্যাটালগে সরাসরি পাওয়া যায়নি। অনুগ্রহ করে ম্যানুয়ালি ওষুধটি সার্চ করুন।
                              </div>
                            )}

                            {/* Pharmacy Safety: Explicit Alternatives if Out of Stock */}
                            {item.isOutOfStock && item.alternativeProducts.length > 0 && (
                              <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                                <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                                  <Info className="w-3.5 h-3.5" />
                                  একই জেনেরিকের স্টক থাকা বিকল্প ওষুধ বেছে নিন:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {item.alternativeProducts.map((alt) => (
                                    <button
                                      key={alt.id}
                                      onClick={() => handleSwapProduct(idx, alt)}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-left text-white text-[11px] flex items-center gap-2 transition-all hover:scale-102"
                                    >
                                      <div>
                                        <div className="font-bold">{alt.name} ({alt.company})</div>
                                        <div className="text-[10px] text-emerald-400">৳{alt.sellingPrice} • স্টক: {alt.availableStock}</div>
                                      </div>
                                      <Check className="w-3 h-3 text-amber-400" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls: Quantity Stepper & Change Action */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-800">
                          
                          {/* Quantity Stepper */}
                          <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-xl p-1">
                            <button
                              onClick={() => updateItemQuantity(idx, -1)}
                              disabled={qty <= 1}
                              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center font-bold text-sm text-white">
                              {qty}
                            </span>
                            <button
                              onClick={() => updateItemQuantity(idx, 1)}
                              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Swap / Change Button */}
                          <button
                            onClick={() => {
                              setActiveSearchIndex(isSwapping ? null : idx);
                              setSearchQuery(item.brandName || "");
                              if (!isSwapping) {
                                handleSearchQueryChange(item.brandName || "");
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Search className="w-3.5 h-3.5 text-emerald-400" />
                            {isSwapping ? "বন্ধ করুন" : "ওষুধ পরিবর্তন"}
                          </button>
                        </div>
                      </div>

                      {/* Inline Product Search & Swap Box */}
                      {isSwapping && (
                        <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold text-emerald-400">ক্যাটালগ থেকে সঠিক ওষুধ নির্বাচন করুন:</span>
                            <span>{searchResults.length} টি রেজাল্ট</span>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => handleSearchQueryChange(e.target.value)}
                              placeholder="ওষুধ বা কোম্পানির নাম লিখে খুঁজুন..."
                              className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                              autoFocus
                            />
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                          </div>

                          {isSearchingReplacements ? (
                            <div className="py-4 text-center text-xs text-slate-400">খোঁজা হচ্ছে...</div>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                              {searchResults.map((prod) => (
                                <button
                                  key={prod.id}
                                  onClick={() => handleSwapProduct(idx, prod)}
                                  className="w-full p-2.5 rounded-lg bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 text-left flex items-center justify-between text-xs transition-all group"
                                >
                                  <div>
                                    <div className="font-bold text-white group-hover:text-emerald-300">
                                      {prod.name} <span className="text-slate-400 font-normal">({prod.company})</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400">{prod.genericName} • {prod.strength}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-emerald-400">৳{prod.sellingPrice}</div>
                                    <div className="text-[10px] text-slate-500">স্টক: {prod.availableStock}</div>
                                  </div>
                                </button>
                              ))}
                              {searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                                <p className="text-xs text-slate-500 text-center py-2">কোনো ওষুধ পাওয়া যায়নি।</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* --- Sticky Footer Action Bar --- */}
        {items.length > 0 && !isScanning && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Procurement Cost Summary */}
            <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 w-full sm:w-auto">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">নির্বাচিত ওষুধ</span>
                <strong className="text-sm sm:text-base text-white font-black">{selectedCount} টি আইটেম</strong>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">মোট পাইকারি মূল্য</span>
                <strong className="text-base sm:text-lg text-emerald-400 font-black">৳{totalSelling.toLocaleString()}</strong>
              </div>
              {totalSavings > 0 && (
                <div className="hidden sm:block">
                  <span className="text-[11px] text-emerald-400/80 block font-medium">ফার্মেসির সাশ্রয়</span>
                  <span className="text-xs font-bold text-emerald-300">৳{totalSavings.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="w-1/3 sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition-colors"
              >
                বাতিল
              </button>

              <button
                onClick={handleCartAll}
                disabled={selectedCount === 0 || isCarting || cartSuccess}
                className="w-2/3 sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isCarting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    কার্ট তৈরি হচ্ছে...
                  </>
                ) : cartSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-slate-950" />
                    কার্টে যোগ হয়েছে!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    কার্টে যোগ করুন (Cart it)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
