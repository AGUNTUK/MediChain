import React, { useState, useEffect } from "react";
import { Bell, BellRing, Check, Loader2 } from "lucide-react";
import { restockService } from "../services/restockService";
import { productService } from "../services/product";

interface StockAlertButtonProps {
  productId: string;
  productName?: string;
  compact?: boolean;
  className?: string;
  onRequestCreated?: () => void;
}

export const StockAlertButton: React.FC<StockAlertButtonProps> = ({
  productId,
  productName = "ওষুধ",
  compact = false,
  className = "",
  onRequestCreated
}) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    
    // Check initial local cache state
    const hasLocal = productService.hasRestockAlert(productId);
    if (hasLocal) setIsSubscribed(true);

    // Sync with backend active request check
    restockService.hasActiveRequest(productId)
      .then(active => {
        if (isMounted) setIsSubscribed(active || hasLocal);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLoading) return;

    if (isSubscribed) {
      setToastMessage("আপনার রিকোয়েস্ট ইতিমধ্যে সক্রিয় রয়েছে। স্টক আসার সাথে সাথে নোটিফিকেশন পাবেন।");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      return;
    }

    setIsLoading(true);
    try {
      const result = await restockService.requestStockAlert(productId, 1);
      setIsSubscribed(true);
      
      // Cache product ID locally for instant UI response
      const alerts = productService.getRestockAlerts();
      if (!alerts.includes(productId)) {
        localStorage.setItem("medichain_restock_alerts", JSON.stringify([...alerts, productId]));
      }

      setToastMessage(
        result.isExisting 
          ? "আপনার রিকোয়েস্টটি সক্রিয় রয়েছে।" 
          : `${productName}-এর রিকোয়েস্ট গ্রহণ করা হয়েছে। স্টক আসামাত্র নোটিফিকেশন পাবেন!`
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      
      if (onRequestCreated) onRequestCreated();
    } catch (err: any) {
      console.warn("Stock alert submission error:", err);
      // Optimistic fallback
      setIsSubscribed(true);
      setToastMessage("স্টক এলার্ট সক্রিয় করা হয়েছে।");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isLoading}
          title={isSubscribed ? "স্টক এলার্ট সক্রিয় আছে (স্টক আসলে নোটিফিকেশন পাবেন)" : "স্টক এলার্ট সেট করুন"}
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-xs ${
            isSubscribed
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/80 shadow-emerald-500/20"
              : "bg-purple-50 text-brand-purple border border-purple-200 hover:bg-brand-purple hover:text-white"
          } ${className}`}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isSubscribed ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-200" />
              <span>এলার্ট সক্রিয়</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5" />
              <span>স্টক এলার্ট</span>
            </>
          )}
        </button>

        {showToast && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 text-emerald-300 text-[9px] font-extrabold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-30 animate-fade-in border border-slate-700">
            ✓ {toastMessage || "স্টক এলার্ট সেট করা হয়েছে!"}
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
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
          isSubscribed
            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25"
            : "bg-brand-purple hover:bg-indigo-700 text-white shadow-brand-purple/25"
        } ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>রিকোয়েস্ট প্রসেস হচ্ছে...</span>
          </>
        ) : isSubscribed ? (
          <>
            <BellRing className="w-4 h-4 text-emerald-200 animate-pulse" />
            <span>✓ রিকোয়েস্ট সক্রিয় (স্টক আসামাত্র জানানো হবে)</span>
          </>
        ) : (
          <>
            <Bell className="w-4 h-4 text-brand-lime" />
            <span>🔔 স্টক এলার্ট পাঠান (Request Restock)</span>
          </>
        )}
      </button>

      {showToast && (
        <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default StockAlertButton;
