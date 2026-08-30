import React, { useState, useEffect } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { productService } from "../services/product";

interface StockAlertButtonProps {
  productId: string;
  productName?: string;
  compact?: boolean;
  className?: string;
}

export const StockAlertButton: React.FC<StockAlertButtonProps> = ({
  productId,
  productName = "ওষুধ",
  compact = false,
  className = ""
}) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setIsSubscribed(productService.hasRestockAlert(productId));
  }, [productId]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const nextState = productService.toggleRestockAlert(productId);
    setIsSubscribed(nextState);

    if (nextState) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  if (compact) {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleToggle}
          title={isSubscribed ? "স্টক এলার্ট সক্রিয় আছে (স্টক আসলে নোটিফিকেশন পাবেন)" : "স্টক এলার্ট সেট করুন"}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs ${
            isSubscribed
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500"
              : "bg-brand-purple hover:bg-indigo-700 text-white border border-indigo-500/30"
          } ${className}`}
        >
          {isSubscribed ? (
            <>
              <Check className="w-3 h-3 text-emerald-200" />
              <span>এলার্ট সক্রিয়</span>
            </>
          ) : (
            <>
              <Bell className="w-3 h-3 text-brand-lime" />
              <span>স্টক এলার্ট</span>
            </>
          )}
        </button>

        {showToast && (
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-30 animate-fade-in border border-slate-700">
            ✓ স্টক এলার্ট সক্রিয়!
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
          isSubscribed
            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
            : "bg-brand-purple hover:bg-indigo-700 text-white shadow-brand-purple/20"
        } ${className}`}
      >
        {isSubscribed ? (
          <>
            <BellRing className="w-4 h-4 text-emerald-200 animate-pulse" />
            <span>✓ এলার্ট সক্রিয় (স্টক আসলে জানানো হবে)</span>
          </>
        ) : (
          <>
            <Bell className="w-4 h-4 text-brand-lime" />
            <span>🔔 স্টক এলার্ট সেট করুন (Stock Alert)</span>
          </>
        )}
      </button>

      {showToast && (
        <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[10px] font-semibold flex items-center gap-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{productName}-এর স্টক এলার্ট সফলভাবে চালু হয়েছে!</span>
        </div>
      )}
    </div>
  );
};

export default StockAlertButton;
