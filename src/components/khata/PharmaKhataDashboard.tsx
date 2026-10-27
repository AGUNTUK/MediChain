import React, { useState } from "react";
import { 
  Eye, 
  EyeOff, 
  ChevronRight, 
  TrendingUp, 
  Receipt, 
  Users, 
  ArrowUpRight, 
  ShoppingBag, 
  Truck, 
  Plus, 
  BookOpen, 
  Sparkles,
  Calendar
} from "lucide-react";
import { KhataSummary, KhataTransaction } from "../../types/khata";
import { toBengaliNumber } from "../../lib/utils";

interface PharmaKhataDashboardProps {
  summary: KhataSummary;
  recentTransactions?: KhataTransaction[];
  pharmacyName?: string;
  onNavigateTab: (tab: 'sales' | 'short_book' | 'customers' | 'suppliers' | 'expenses' | 'purchases') => void;
  onOpenNewSale: () => void;
  onOpenNewExpense: () => void;
}

export default function PharmaKhataDashboard({
  summary,
  recentTransactions = [],
  pharmacyName = "City Pharma",
  onNavigateTab,
  onOpenNewSale,
  onOpenNewExpense
}: PharmaKhataDashboardProps) {
  const [showCashBalance, setShowCashBalance] = useState(false);

  const todayBengaliDate = new Date().toLocaleDateString("bn-BD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* 1. Top Hero Card: Gradient Orange / Purple banner with bKash-style Eye Toggle */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white p-5 sm:p-6 shadow-lg border border-purple-400/20">
        {/* Subtle decorative background shapes */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-brand-lime/20 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-lime" />
                {todayBengaliDate}
              </span>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {pharmacyName} — আজকের হিসাব
              </h3>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-brand-lime border border-white/15">
              স্মার্ট খাতা
            </span>
          </div>

          {/* Cash in Hand Block */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-200 mb-1">
                আজকের ক্যাশ ব্যালেন্স (Cash In - Cash Out)
              </p>
              <div className="flex items-center gap-2">
                {showCashBalance ? (
                  <span className="text-2xl sm:text-3xl font-black text-brand-lime tracking-tight">
                    ৳ {toBengaliNumber(summary.netCashInHand.toLocaleString())}
                  </span>
                ) : (
                  <span className="text-2xl sm:text-3xl font-black tracking-widest text-white/70">
                    ৳ • • • • • •
                  </span>
                )}
              </div>
            </div>

            {/* Toggle Eye Button */}
            <button
              type="button"
              onClick={() => setShowCashBalance(!showCashBalance)}
              className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              {showCashBalance ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-brand-lime" />
                  <span>আড়াল করুন</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-brand-lime" />
                  <span>ব্যালেন্স দেখুন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 2x3 Metric Grid (6 Cards with › navigation) */}
      <div className="space-y-2">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider px-1">
          সারসংক্ষেপ মেট্রিক
        </h4>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Card 1: মোট বিক্রি (Green) */}
          <div
            onClick={() => onNavigateTab('sales')}
            className="bg-white rounded-2xl p-3.5 border border-emerald-100/90 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 leading-snug">মোট বিক্রি</span>
              <p className="text-base sm:text-lg font-black text-emerald-600 leading-relaxed truncate">
                ৳ {toBengaliNumber(summary.totalSalesToday.toLocaleString())}
              </p>
            </div>
          </div>

          {/* Card 2: ক্যাশ (বিক্রি + কালেকশন) (Blue) */}
          <div
            onClick={() => onNavigateTab('sales')}
            className="bg-white rounded-2xl p-3.5 border border-blue-100/90 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 leading-snug truncate block">ক্যাশ (বিক্রি+কালেকশন)</span>
              <p className="text-base sm:text-lg font-black text-blue-600 leading-relaxed truncate">
                ৳ {toBengaliNumber(summary.cashCollectedToday.toLocaleString())}
              </p>
            </div>
          </div>

          {/* Card 3: মোট বাকি (Orange/Amber) */}
          <div
            onClick={() => onNavigateTab('customers')}
            className="bg-white rounded-2xl p-3.5 border border-amber-100/90 hover:border-amber-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 leading-snug">মোট বাকি</span>
              <p className="text-base sm:text-lg font-black text-amber-600 leading-relaxed truncate">
                ৳ {toBengaliNumber(summary.totalDueCustomers.toLocaleString())}
              </p>
            </div>
          </div>

          {/* Card 4: খরচ (Red) */}
          <div
            onClick={() => onNavigateTab('expenses')}
            className="bg-white rounded-2xl p-3.5 border border-rose-100/90 hover:border-rose-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 leading-snug">খরচ</span>
              <p className="text-base sm:text-lg font-black text-rose-600 leading-relaxed truncate">
                ৳ {toBengaliNumber(summary.totalExpensesToday.toLocaleString())}
              </p>
            </div>
          </div>

          {/* Card 5: মোট ক্রয় (Indigo) */}
          <div
            onClick={() => onNavigateTab('purchases')}
            className="bg-white rounded-2xl p-3.5 border border-indigo-100/90 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 leading-snug">মোট ক্রয়</span>
              <p className="text-base sm:text-lg font-black text-indigo-600 leading-relaxed truncate">
                ৳ {toBengaliNumber(summary.totalPurchasesToday.toLocaleString())}
              </p>
            </div>
          </div>

          {/* Card 6: কাস্টমার (Green count) */}
          <div
            onClick={() => onNavigateTab('customers')}
            className="bg-white rounded-2xl p-3.5 border border-teal-100/90 hover:border-teal-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 leading-snug">কাস্টমার</span>
              <p className="text-base sm:text-lg font-black text-teal-700 leading-relaxed truncate">
                {toBengaliNumber(summary.activeCustomersCount)} জন
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Link Card: সাপ্লায়ার — লেনদেন ও হিসাবে বিস্তারিত বিবরণ › */}
      <div
        onClick={() => onNavigateTab('suppliers')}
        className="bg-gradient-to-r from-teal-50 via-white to-purple-50 p-4 rounded-2xl border border-teal-200/80 hover:border-brand-purple shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-brand-purple transition-colors">
              সাপ্লায়ার — লেনদেন ও হিসাবে বিস্তারিত বিবরণ
            </h5>
            <p className="text-[11px] font-medium text-slate-500">
              মোট দেনা: <span className="font-bold text-rose-600">৳ {toBengaliNumber(summary.totalPayableSuppliers.toLocaleString())}</span> • মেডিচেইন ভেরিফাইড
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-purple group-hover:translate-x-1 transition-all shrink-0" />
      </div>

      {/* 4. Short Book Banner: ১-ক্লিক শর্ট খাতা ট্র্যাকার */}
      <div
        onClick={() => onNavigateTab('short_book')}
        className="bg-gradient-to-r from-lime-50/90 via-white to-lime-50/60 p-4 rounded-2xl border border-lime-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-lime text-slate-950 flex items-center justify-center shrink-0 font-black shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h5 className="text-xs sm:text-sm font-black text-slate-900">
                শর্ট খাতা (স্টক ঘাটতি ট্র্যাকার)
              </h5>
              <span className="bg-brand-lime text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">
                1-Click
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-600">
              {summary.pendingShortItemsCount > 0 ? (
                <>বর্তমানে <span className="font-bold text-amber-700">{toBengaliNumber(summary.pendingShortItemsCount)}টি ওষুধ</span> শর্টে আছে • কার্টে যোগ করতে ট্যাপ করুন</>
              ) : (
                <>কোনো ওষুধ শর্টে নেই • নতুন ওষুধ যোগ করুন</>
              )}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all shrink-0" />
      </div>

      {/* Floating Action Buttons */}
      <div className="pt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenNewSale}
          className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-lime to-lime-500 hover:from-lime-500 hover:to-lime-600 text-slate-950 font-black text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ নতুন বিক্রি লিখুন</span>
        </button>

        <button
          type="button"
          onClick={onOpenNewExpense}
          className="py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm shadow-2xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
        >
          <span>ব্যয় লিখুন</span>
        </button>
      </div>
    </div>
  );
}
