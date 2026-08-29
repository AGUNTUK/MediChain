import React, { useState, useRef } from "react";
import { Upload, Scan, Loader2, FileImage, X, Check, ShoppingCart, Info, Search } from "lucide-react";
import { prescriptionService, ScannedMedicine } from "../services/prescription";
import { orderService } from "../services/order";

export default function PrescriptionScanner({ onClose }: { onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScannedMedicine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setImage(base64);
      setResults(null);
      setError(null);
      handleScan(base64);
    };
    reader.onerror = () => setError("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const handleScan = async (base64: string) => {
    setScanning(true);
    setError(null);
    try {
      const response = await prescriptionService.scanPrescription(base64);
      if (response.success && response.items) {
        setResults(response.items);
      } else {
        setError("Optical scanning completed but returned no recognizable items.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with optical scanning engine.");
    } finally {
      setScanning(false);
    }
  };

  const handleAddToCart = async (matchedProductId: string, quantity: number) => {
    setAddingToCart((prev) => ({ ...prev, [matchedProductId]: true }));
    try {
      await orderService.addToCart(matchedProductId, quantity);
      alert("Added to cart successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to add to cart.");
    } finally {
      setAddingToCart((prev) => ({ ...prev, [matchedProductId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
              <Scan className="w-5 h-5 text-brand-purple" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">প্রেসক্রিপশন স্ক্যানার</h2>
              <p className="text-xs font-medium text-slate-500">আর্টিফিশিয়াল ইন্টেলিজেন্স দ্বারা চালিত</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {!image && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand-purple hover:bg-brand-purple/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-brand-purple/10 transition-colors">
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-brand-purple" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-700">প্রেসক্রিপশনের ছবি আপলোড করুন</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">হাতে লেখা বা প্রিন্ট করা প্রেসক্রিপশনের ছবি দিলে ওষুধ নিজে থেকেই কার্টে যোগ হবে।</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload}
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
              />
            </div>
          )}

          {image && (
            <div className="flex flex-col gap-6">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner max-h-64 flex justify-center">
                <img src={image} alt="Uploaded prescription" className="max-h-64 object-contain" />
                <button 
                  onClick={() => { setImage(null); setResults(null); }}
                  className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {scanning && (
                  <div className="absolute inset-0 bg-indigo-900/20 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-10 h-10 animate-spin mb-3" />
                    <span className="font-bold tracking-wide drop-shadow-md">প্রেসক্রিপশন স্ক্যান ও ওষুধ অনুসন্ধান চলছে...</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                  <Info className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-red-800">স্ক্যান সম্পন্ন হয়নি</h4>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {results && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-500" />
                    স্ক্যান ফলাফল ({results.length} টি ওষুধ পাওয়া গেছে)
                  </h3>
                  
                  <div className="space-y-3">
                    {results.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 truncate">{item.extractedName}</h4>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                            {item.extractedStrength && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{item.extractedStrength}</span>}
                            <span>পরিমাণ: {item.extractedQuantity}</span>
                          </div>
                        </div>

                        {item.matchedProduct ? (
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs font-bold text-emerald-600">ডিপোতে পাওয়া গেছে</p>
                              <p className="text-[10px] text-slate-500">{item.matchedProduct.company}</p>
                            </div>
                            <button
                              onClick={() => handleAddToCart(item.matchedProduct!.id, item.extractedQuantity)}
                              disabled={addingToCart[item.matchedProduct!.id]}
                              className="px-4 py-2 bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {addingToCart[item.matchedProduct!.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                              কার্টে যোগ করুন
                            </button>
                          </div>
                        ) : (
                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold">
                              <Search className="w-3.5 h-3.5" />
                              ডিপোতে নেই
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
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
