import React, { useState, useEffect } from "react";
import { 
  Eye, 
  EyeOff, 
  ChevronRight, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Truck, 
  ArrowDownRight, 
  ArrowUpRight, 
  PlusCircle, 
  BookOpen, 
  Sparkles,
  Receipt
} from "lucide-react";
import { KhataSummary } from "../../types/khata";
import { toBengaliNumber } from "../../lib/utils";

interface PharmaKhataHomeWidgetProps {
  summary: KhataSummary;
  onOpenHub: (initialTab?: 'dashboard' | 'sales' | 'short_book' | 'customers' | 'suppliers' | 'expenses' | 'new_sale' | 'new_expense' | 'new_purchase') => void;
  pharmacyName?: string;
}

export default function PharmaKhataHomeWidget({
  summary,
  onOpenHub,
  pharmacyName = "City Pharma"
}: PharmaKhataHomeWidgetProps) {
  // bKash-style Tap-to-Reveal Balance State (auto-hides after 5 seconds)
  const [showBalance, setShowBalance] = useState(false);
  const [balanceProgress, setBalanceProgress] = useState(100);

  const toggleBalance = () => {
    if (showBalance) {
      setShowBalance(false);
      setBalanceProgress(100);
    } else {
      setShowBalance(true);
      setBalanceProgress(100);
    }
  };

  useEffect(() => {
    if (!showBalance) return;

    const intervalTime = 50; // update every 50ms
    const totalDuration = 5000; // 5 seconds
    const decrement = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setBalanceProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          setShowBalance(false);
          return 100;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [showBalance]);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-100/90 shadow-xs p-3.5 sm:p-4 space-y-3.5 transition-all">
      {/* 1. Top Row: Privacy Balance Pill (bKash Style) + Action Link */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* bKash-style Privacy Balance Pill */}
          <button
            type="button"
            onClick={toggleBalance}
            className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-50 via-slate-50 to-lime-50/60 border border-purple-200/70 hover:border-brand-purple text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs select-none active:scale-95"
            title="ট্যাপ করে ব্যালেন্স দেখুন"
          >
            {showBalance ? (
              <EyeOff className="w-3.5 h-3.5 text-purple-700" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-purple-700 group-hover:scale-110 transition-transform" />
            )}

            <div className="flex items-center gap-1 min-w-[95px] justify-center">
              {showBalance ? (
                <span className="font-extrabold text-emerald-700 tracking-tight text-xs sm:text-sm animate-fade-in">
                  ৳ {toBengaliNumber(summary.netCashInHand.toLocaleString())}
                </span>
              ) : (
                <span className="text-slate-600 font-bold text-[11px] sm:text-xs">
                  ৳ ব্যালেন্স দেখুন
                </span>
              )}
            </div>

            {/* Auto-hide mini progress indicator when balance is visible */}
            {showBalance && (
              <div 
                className="absolute bottom-0 left-2 right-2 h-[2px] bg-brand-lime rounded-full transition-all duration-75"
                style={{ width: `${balanceProgress}%` }}
              />
            )}
          </button>

          <span className="text-[10px] sm:text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/50 hidden xs:inline-block">
            স্মার্ট খাতা
          </span>
        </div>

        {/* View All / Open Hub */}
        <button
          type="button"
          onClick={() => onOpenHub('dashboard')}
          className="flex items-center gap-0.5 text-xs font-black text-brand-purple hover:text-purple-800 transition-colors cursor-pointer group"
        >
          <span>আজকের হিসাব</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 2. Middle Row: Horizontal Swipeable Quick Actions (Responsive Grid on Tablet/Desktop, 6 Cards) */}
      <div className="flex sm:grid sm:grid-cols-6 items-center sm:items-stretch gap-2 overflow-x-auto scrollbar-hide pt-2.5 pb-1 -mx-1 px-1">
        {/* Quick Action 1: নতুন বিক্রি */}
        <button
          type="button"
          onClick={() => onOpenHub('new_sale')}
          className="flex-1 min-w-[84px] flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-purple-50/70 to-white hover:from-purple-100/80 border border-purple-100 hover:border-purple-300 transition-all cursor-pointer group shrink-0 sm:shrink active:scale-95 shadow-2xs"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-black text-slate-800 text-center leading-snug">
            নতুন বিক্রি
          </span>
        </button>

        {/* Quick Action 2: শর্ট খাতা with 1-Click Order Badge */}
        <button
          type="button"
          onClick={() => onOpenHub('short_book')}
          className="relative flex-1 min-w-[88px] flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-lime-50/80 to-white hover:from-lime-100/80 border border-lime-200/80 hover:border-brand-lime transition-all cursor-pointer group shrink-0 sm:shrink active:scale-95 shadow-2xs"
        >
          {/* 1-Click Order Pill Badge - Cleanly positioned inside card */}
          <span className="absolute top-1 right-1 bg-brand-lime text-slate-950 font-black text-[8px] px-1.5 py-0.5 rounded-full border border-white shadow-xs flex items-center gap-0.5 z-10">
            <Sparkles className="w-2 h-2 text-slate-900" />
            1-Click
          </span>
          <div className="w-8 h-8 rounded-lg bg-lime-100 text-lime-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-black text-slate-800 text-center leading-snug">
            শর্ট খাতা
          </span>
        </button>

        {/* Quick Action 3: বাকি আদায় */}
        <button
          type="button"
          onClick={() => onOpenHub('customers')}
          className="flex-1 min-w-[84px] flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-amber-50/70 to-white hover:from-amber-100/80 border border-amber-100 hover:border-amber-300 transition-all cursor-pointer group shrink-0 sm:shrink active:scale-95 shadow-2xs"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-black text-slate-800 text-center leading-snug">
            বাকি আদায়
          </span>
        </button>

        {/* Quick Action 4: ক্রয় লিখুন */}
        <button
          type="button"
          onClick={() => onOpenHub('new_purchase')}
          className="flex-1 min-w-[84px] flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-indigo-50/70 to-white hover:from-indigo-100/80 border border-indigo-100 hover:border-indigo-300 transition-all cursor-pointer group shrink-0 sm:shrink active:scale-95 shadow-2xs"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-black text-slate-800 text-center leading-snug">
            ক্রয় লিখুন
          </span>
        </button>

        {/* Quick Action 5: সাপ্লায়ার */}
        <button
          type="button"
          onClick={() => onOpenHub('suppliers')}
          className="flex-1 min-w-[84px] flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-teal-50/70 to-white hover:from-teal-100/80 border border-teal-100 hover:border-teal-300 transition-all cursor-pointer group shrink-0 sm:shrink active:scale-95 shadow-2xs"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <Truck className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-black text-slate-800 text-center leading-snug">
            সাপ্লায়ার
          </span>
        </button>

        {/* Quick Action 6: ব্যয় লিখুন */}
        <button
          type="button"
          onClick={() => onOpenHub('new_expense')}
          className="flex-1 min-w-[84px] flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-rose-50/70 to-white hover:from-rose-100/80 border border-rose-100 hover:border-rose-300 transition-all cursor-pointer group shrink-0 sm:shrink active:scale-95 shadow-2xs"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-black text-slate-800 text-center leading-snug">
            ব্যয় লিখুন
          </span>
        </button>
      </div>

      {/* 3. Bottom Row: 3-Column Live Summary Strip */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-purple-50">
        {/* Card 1: মোট বিক্রি */}
        <div 
          onClick={() => onOpenHub('sales')}
          className="bg-emerald-50/60 hover:bg-emerald-50/90 border border-emerald-100 rounded-xl p-2 sm:p-2.5 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 mb-0.5">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>মোট বিক্রি</span>
          </div>
          <p className="font-black text-xs sm:text-sm text-emerald-700 leading-relaxed truncate">
            ৳ {toBengaliNumber(summary.totalSalesToday.toLocaleString())}
          </p>
        </div>

        {/* Card 2: ক্যাশ (বিক্রি + আদায়) */}
        <div 
          onClick={() => onOpenHub('sales')}
          className="bg-blue-50/60 hover:bg-blue-50/90 border border-blue-100 rounded-xl p-2 sm:p-2.5 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-800 mb-0.5">
            <Receipt className="w-3 h-3 text-blue-600" />
            <span className="truncate">ক্যাশ (বিক্রি+আদায়)</span>
          </div>
          <p className="font-black text-xs sm:text-sm text-blue-700 leading-relaxed truncate">
            ৳ {toBengaliNumber(summary.cashCollectedToday.toLocaleString())}
          </p>
        </div>

        {/* Card 3: মোট বাকি */}
        <div 
          onClick={() => onOpenHub('customers')}
          className="bg-amber-50/60 hover:bg-amber-50/90 border border-amber-100 rounded-xl p-2 sm:p-2.5 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 mb-0.5">
            <Users className="w-3 h-3 text-amber-600" />
            <span>মোট বাকি</span>
          </div>
          <p className="font-black text-xs sm:text-sm text-amber-700 leading-relaxed truncate">
            ৳ {toBengaliNumber(summary.totalDueCustomers.toLocaleString())}
          </p>
        </div>
      </div>
    </div>
  );
}
