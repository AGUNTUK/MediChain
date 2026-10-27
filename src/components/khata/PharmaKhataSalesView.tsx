import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  TrendingUp, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  ArrowDownRight,
  Filter,
  X
} from "lucide-react";
import { KhataTransaction, KhataCustomer } from "../../types/khata";
import { toBengaliNumber } from "../../lib/utils";

interface PharmaKhataSalesViewProps {
  transactions: KhataTransaction[];
  customers: KhataCustomer[];
  onOpenNewSale: () => void;
  onOpenCustomerDueModal?: (customer: KhataCustomer) => void;
}

export default function PharmaKhataSalesView({
  transactions,
  customers,
  onOpenNewSale,
  onOpenCustomerDueModal
}: PharmaKhataSalesViewProps) {
  // Date filters
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter sales and due collection transactions
  const filteredSales = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== "SALE" && t.type !== "DUE_COLLECTION") return false;

      // Date filter
      const txDate = t.created_at.split("T")[0];
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;

      // Customer filter
      if (selectedCustomerId !== "all" && t.customer_id !== selectedCustomerId) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const custName = (t.customer_name || "").toLowerCase();
        const note = (t.note || "").toLowerCase();
        return custName.includes(q) || note.includes(q);
      }

      return true;
    });
  }, [transactions, startDate, endDate, selectedCustomerId, searchQuery]);

  // Aggregate totals
  const aggregates = useMemo(() => {
    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;

    filteredSales.forEach(t => {
      if (t.type === "SALE") {
        totalSales += Number(t.total_amount || 0);
        totalPaid += Number(t.paid_amount || 0);
        totalDue += Number(t.due_amount || 0);
      } else if (t.type === "DUE_COLLECTION") {
        totalPaid += Number(t.paid_amount || 0);
      }
    });

    return { totalSales, totalPaid, totalDue };
  }, [filteredSales]);

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      {/* 1. Top Summary Box */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-purple-600" />
            বিক্রি ও কালেকশন সারাংশ
          </span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {toBengaliNumber(filteredSales.length)} টি লেনদেন
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
          {/* মোট বিক্রয় */}
          <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-800 leading-snug block">মোট বিক্রয়</span>
            <p className="text-sm sm:text-base font-black text-emerald-700 truncate leading-relaxed">
              ৳ {toBengaliNumber(aggregates.totalSales.toLocaleString())}
            </p>
          </div>

          {/* পরিশোধ */}
          <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
            <span className="text-[10px] font-bold text-blue-800 leading-snug block">পরিশোধ</span>
            <p className="text-sm sm:text-base font-black text-blue-700 truncate leading-relaxed">
              ৳ {toBengaliNumber(aggregates.totalPaid.toLocaleString())}
            </p>
          </div>

          {/* মোট বাকি */}
          <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-100">
            <span className="text-[10px] font-bold text-amber-800 leading-snug block">মোট বাকি</span>
            <p className="text-sm sm:text-base font-black text-amber-700 truncate leading-relaxed">
              ৳ {toBengaliNumber(aggregates.totalDue.toLocaleString())}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Filters & Customer Selector Bar */}
      <div className="bg-white p-3 rounded-2xl border border-purple-100/80 shadow-2xs space-y-2.5">
        {/* Date Pickers */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">শুরুর তারিখ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">শেষের তারিখ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
            />
          </div>
        </div>

        {/* Customer Filter Dropdown & Search */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কাস্টমার নাম বা নোট দিয়ে খুঁজুন..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
            />
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none max-w-[130px] truncate"
          >
            <option value="all">সব কাস্টমার</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Sales & Collections Transaction List */}
      <div className="space-y-2">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider px-1">
          বিক্রির তালিকা
        </h4>

        {filteredSales.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 space-y-2">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              নির্বাচিত তারিখে কোনো বিক্রি বা কালেকশন পাওয়া যায়নি
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSales.map(tx => {
              const isDueCollection = tx.type === "DUE_COLLECTION";
              const isFullDue = tx.due_amount > 0 && tx.paid_amount === 0;
              const isPartialDue = tx.due_amount > 0 && tx.paid_amount > 0;
              const isCashOnly = tx.due_amount === 0;

              const timeStr = new Date(tx.created_at).toLocaleTimeString("bn-BD", {
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div
                  key={tx.id}
                  className="bg-white rounded-2xl p-3.5 border border-purple-100 hover:border-purple-200 shadow-2xs space-y-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {tx.customer_name || "নগদ বিক্রি (নাম ছাড়া)"}
                        </span>
                        
                        {isDueCollection ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                            বাকি আদায়
                          </span>
                        ) : isFullDue ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/60">
                            পুরো বাকি
                          </span>
                        ) : isPartialDue ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                            আংশিক বাকি
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                            নগদ পরিশোধিত
                          </span>
                        )}
                      </div>

                      {tx.note && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{tx.note}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-black text-slate-900">
                        ৳ {toBengaliNumber(tx.total_amount.toLocaleString())}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  {/* Payment Details Footer */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 text-[11px]">
                    <span className="text-slate-500 font-medium">
                      মাধ্যম: <strong className="text-slate-700">{tx.payment_method || 'Cash'}</strong>
                    </span>

                    {tx.due_amount > 0 ? (
                      <span className="font-bold text-amber-700">
                        বাকি: ৳{toBengaliNumber(tx.due_amount.toLocaleString())}
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        পরিশোধিত
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Primary CTA */}
      <div className="sticky bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-purple-100 shadow-lg rounded-2xl">
        <button
          type="button"
          onClick={onOpenNewSale}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-lime to-lime-500 hover:from-lime-500 hover:to-lime-600 text-slate-950 font-black text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ নতুন বিক্রি</span>
        </button>
      </div>
    </div>
  );
}
