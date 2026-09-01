import React, { useState, useRef } from "react";
import { Upload, Scan, Loader2, X, Check, ShoppingCart, Info, Search, Plus, Minus, Camera, Sparkles, CheckCircle2 } from "lucide-react";
import { prescriptionService, ScannedMedicine } from "../services/prescription";
import { orderService } from "../services/order";

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

export default function PrescriptionScanner({ onClose }: { onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScannedMedicine[] | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});
  const [addingAll, setAddingAll] = useState(false);
  const [allAddedSuccess, setAllAddedSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScanning(true);
      setError(null);
      const base64 = await compressImageForOCR(file);
      setImage(base64);
      setResults(null);
      setAllAddedSuccess(false);
      handleScan(base64);
    } catch (err) {
      setError("ছবিটি প্রসেস করা সম্ভব হয়নি। অনুগ্রহ করে অন্য ছবি নির্বাচন করুন।");
      setScanning(false);
    }
  };

  const handleScan = async (base64: string) => {
    setScanning(true);
    setError(null);
    setAllAddedSuccess(false);
    try {
      const response = await prescriptionService.scanPrescription(base64);
      if (response.success && response.items && response.items.length > 0) {
        setResults(response.items);
        // Initialize quantities
        const initialQty: Record<number, number> = {};
        response.items.forEach((item, idx) => {
          initialQty[idx] = item.extractedQuantity && item.extractedQuantity > 0 ? item.extractedQuantity : 1;
        });
        setQuantities(initialQty);
      } else {
        setError("প্রেসক্রিপশনে কোনো পরিচিত ওষুধের নাম শনাক্ত করা সম্ভব হয়নি। অনুগ্রহ করে স্পষ্ট আলোতে তোলা ছবি দিন।");
      }
    } catch (err: any) {
      setError(err.message || "প্রেসক্রিপশন স্ক্যান সার্ভারে যোগাযোগ করা সম্ভব হয়নি।");
    } finally {
      setScanning(false);
    }
  };

  const updateQuantity = (idx: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[idx] || 1;
      const updated = Math.max(1, current + delta);
      return { ...prev, [idx]: updated };
    });
  };

  const handleAddToCart = async (idx: number, matchedProductId: string) => {
    const qty = quantities[idx] || 1;
    setAddingToCart((prev) => ({ ...prev, [matchedProductId]: true }));
    try {
      await orderService.addToCart(matchedProductId, qty);
      window.dispatchEvent(new Event("cartUpdated"));
      // Visual feedback
      setAddingToCart((prev) => ({ ...prev, [matchedProductId]: false, [`${matchedProductId}_done`]: true }));
      setTimeout(() => {
        setAddingToCart((prev) => ({ ...prev, [`${matchedProductId}_done`]: false }));
      }, 3000);
    } catch (err: any) {
      alert(err.message || "কার্টে যোগ করা সম্ভব হয়নি।");
      setAddingToCart((prev) => ({ ...prev, [matchedProductId]: false }));
    }
  };

  const handleAddAllInStock = async () => {
    if (!results) return;
    const availableItems = results
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.matchedProduct && item.matchedProduct.id);

    if (availableItems.length === 0) {
      alert("ডিপোতে কোনো ওষুধ পাওয়া যায়নি।");
      return;
    }

    setAddingAll(true);
    let successCount = 0;

    for (const { item, idx } of availableItems) {
      try {
        const qty = quantities[idx] || 1;
        await orderService.addToCart(item.matchedProduct!.id, qty);
        successCount++;
      } catch (err) {
        console.error("Failed to add item:", item.matchedProduct?.name, err);
      }
    }

    window.dispatchEvent(new Event("cartUpdated"));
    setAddingAll(false);
    setAllAddedSuccess(true);
  };

  const matchedCount = results?.filter(r => r.matchedProduct).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Scan className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">AI প্রেসক্রিপশন ও প্রডাক্ট লিস্ট স্ক্যানার</h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gemini AI
                </span>
              </div>
              <p className="text-xs text-purple-200">ছবি আপলোড করলেই ওষুধ শনাক্ত করে স্বয়ংক্রিয়ভাবে কার্টে যোগ হবে</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {!image && (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[240px] sm:min-h-[280px] border-2 border-dashed border-purple-200 hover:border-purple-500 bg-purple-50/30 hover:bg-purple-50/60 rounded-3xl flex flex-col items-center justify-center p-6 gap-4 cursor-pointer transition-all group shadow-inner"
              >
                <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 transition-all">
                  <Upload className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
                </div>
                <div className="text-center max-w-sm">
                  <h3 className="font-black text-slate-800 text-base sm:text-lg">প্রেসক্রিপশন বা মেডিসিন লিস্টের ছবি দিন</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                    হাতে লেখা প্রেসক্রিপশন, প্রিন্ট করা স্লিপ অথবা ঔষধের লিস্টের স্পষ্ট ছবি আপলোড করুন
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Upload className="w-4 h-4" /> ফাইল সিলেক্ট করুন
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Camera className="w-4 h-4" /> ক্যামেরা খুলুন
                  </button>
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload}
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={cameraInputRef} 
                onChange={handleImageUpload}
                accept="image/*"
                capture="environment"
                className="hidden" 
              />
            </div>
          )}

          {image && (
            <div className="flex flex-col gap-5">
              {/* Uploaded image preview bar */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/90 shadow-sm max-h-52 flex items-center justify-center">
                <img src={image} alt="Uploaded prescription" className="max-h-52 object-contain" />
                <button 
                  onClick={() => { setImage(null); setResults(null); }}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 hover:bg-black text-white rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-1.5 transition-all shadow-md"
                >
                  <X className="w-3.5 h-3.5" /> নতুন ছবি
                </button>
                {scanning && (
                  <div className="absolute inset-0 bg-purple-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
                    <Loader2 className="w-10 h-10 animate-spin text-purple-300 mb-3" />
                    <span className="font-bold text-sm tracking-wide text-purple-100">Gemini AI প্রেসক্রিপশন বিশ্লেষণ করছে...</span>
                    <span className="text-xs text-purple-300 mt-1">ডিপোর ২,২০০+ ওষুধের সাথে মেলানো হচ্ছে</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">স্ক্যান সম্পন্ন হয়নি</h4>
                    <p className="text-xs text-rose-700 mt-1">{error}</p>
                    <button
                      onClick={() => handleScan(image)}
                      className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors inline-flex items-center gap-1.5"
                    >
                      পুনরায় চেষ্টা করুন
                    </button>
                  </div>
                </div>
              )}

              {allAddedSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 animate-in fade-in">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black">সবগুলো ওষুধ কার্টে যোগ হয়েছে!</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">আপনার কার্ট চেক করে সরাসরি পাইকারি অর্ডারের জন্য চেকআউট করতে পারেন।</p>
                  </div>
                </div>
              )}

              {results && (
                <div className="space-y-4">
                  {/* Top Bar Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                      <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                        <Check className="w-5 h-5 text-emerald-500" />
                        শনাক্তকৃত ওষুধ ({results.length} টি)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ডিপোতে পাওয়া গেছে: <strong className="text-emerald-600 font-bold">{matchedCount} টি</strong>
                      </p>
                    </div>

                    {matchedCount > 0 && (
                      <button
                        onClick={handleAddAllInStock}
                        disabled={addingAll}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-purple-900/10 transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {addingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                        সবগুলো কার্টে যোগ করুন ({matchedCount})
                      </button>
                    )}
                  </div>
                  
                  {/* List of Scanned Medicines */}
                  <div className="space-y-3">
                    {results.map((item, idx) => {
                      const qty = quantities[idx] || 1;
                      const isMatched = !!item.matchedProduct;
                      const prod = item.matchedProduct;
                      const isAdding = prod ? addingToCart[prod.id] : false;
                      const isDone = prod ? addingToCart[`${prod.id}_done`] : false;

                      return (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-2xl border transition-all ${
                            isMatched 
                              ? "bg-white border-slate-200 hover:border-purple-300 shadow-sm" 
                              : "bg-slate-50/70 border-slate-200 opacity-80"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-slate-900 text-sm sm:text-base">{item.extractedName}</h4>
                                {item.extractedStrength && (
                                  <span className="bg-purple-100 text-purple-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                    {item.extractedStrength}
                                  </span>
                                )}
                              </div>

                              {isMatched && prod ? (
                                <div className="mt-1.5 flex items-center gap-3 text-xs flex-wrap">
                                  <span className="font-bold text-slate-700">{prod.company}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500">{prod.genericName}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-black text-purple-700">৳{prod.sellingPrice.toFixed(2)}</span>
                                  {prod.discountPercentage > 0 && (
                                    <span className="bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                      {prod.discountPercentage}% ছাড়
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-amber-700 mt-1 flex items-center gap-1 font-medium">
                                  <Search className="w-3 h-3" /> ডিপোতে এই মুহূর্তে সরাসরি পাওয়া যায়নি
                                </p>
                              )}
                            </div>

                            {/* Quantity & Action */}
                            {isMatched && prod && (
                              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                                  <button
                                    onClick={() => updateQuantity(idx, -1)}
                                    className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-8 text-center text-xs font-black text-slate-800">
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(idx, 1)}
                                    className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleAddToCart(idx, prod.id)}
                                  disabled={isAdding}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                                    isDone 
                                      ? "bg-emerald-600 text-white" 
                                      : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                                  }`}
                                >
                                  {isAdding ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : isDone ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <ShoppingCart className="w-4 h-4" />
                                  )}
                                  {isDone ? "যোগ হয়েছে" : "কার্টে যোগ"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
