import React, { useState } from "react";
import { Bell, Check } from "lucide-react";

interface StockAlertButtonProps {
  productId: string;
  productName: string;
  compact?: boolean;
  className?: string;
}

export default function StockAlertButton({ productId, productName, compact = false, className = "" }: StockAlertButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubscribed) return;
    setLoading(true);
    try {
      // Register stock alert request
      await fetch("/api/alerts/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, productName })
      }).catch(() => null);
      setIsSubscribed(true);
    } finally {
      setLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <span
        id={`stock-alert-${productId}`}
        className={`inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg ${
          compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        }`}
      >
        <Check className="w-3.5 h-3.5" />
        <span>অ্যালার্ট যুক্ত</span>
      </span>
    );
  }

  return (
    <button
      id={`btn-stock-alert-${productId}`}
      type="button"
      onClick={handleSubscribe}
      disabled={loading}
      className={`inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer ${
        compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      }`}
      title="স্টক আসলে নোটিফিকেশন পান"
    >
      <Bell className="w-3.5 h-3.5 text-amber-600" />
      <span>{compact ? "স্টক অ্যালার্ট" : "স্টক আসলে জানান"}</span>
    </button>
  );
}
