import React, { useState } from "react";
import { 
  Truck, 
  Plus, 
  ShieldCheck, 
  Phone, 
  CreditCard, 
  Search, 
  X, 
  Check, 
  ArrowUpRight,
  Receipt,
  Building2
} from "lucide-react";
import { KhataSupplier, KhataTransaction } from "../../types/khata";
import { toBengaliNumber } from "../../lib/utils";

interface PharmaKhataSuppliersProps {
  suppliers: KhataSupplier[];
  transactions: KhataTransaction[];
  onAddSupplier: (supplier: {
    name: string;
    company?: string;
    phone?: string;
    initialPayable?: number;
    notes?: string;
  }) => Promise<any>;
  onOpenNewPurchase: () => void;
}

export default function PharmaKhataSuppliers({
  suppliers,
  transactions,
  onAddSupplier,
  onOpenNewPurchase
}: PharmaKhataSuppliersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Supplier state
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [initialPayable, setInitialPayable] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPayable = suppliers.reduce((sum, s) => sum + Number(s.total_payable || 0), 0);

  const filteredSuppliers = suppliers.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return s.name.toLowerCase().includes(q) || (s.company && s.company.toLowerCase().includes(q));
  });

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddSupplier({
        name: name.trim(),
        company: company.trim(),
        phone: phone.trim(),
        initialPayable: Number(initialPayable) || 0,
        notes: notes.trim()
      });
      setShowAddModal(false);
      setName("");
      setCompany("");
      setPhone("");
      setInitialPayable("");
      setNotes("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      {/* 1. Header Card displaying মোট সাপ্লায়ার and মোট দেনা (৳) */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-teal-600" />
            সাপ্লায়ার খাতা সারাংশ
          </span>
          <button
            type="button"
            onClick={onOpenNewPurchase}
            className="text-[11px] font-black text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200/60 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            ক্রয় লিখুন
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-100">
            <span className="text-[11px] font-bold text-teal-800 leading-snug block">মোট সাপ্লায়ার</span>
            <p className="text-base sm:text-lg font-black text-teal-700 leading-relaxed truncate">
              {toBengaliNumber(suppliers.length)} টি প্রতিষ্ঠান
            </p>
          </div>

          <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100">
            <span className="text-[11px] font-bold text-rose-800 leading-snug block">মোট দেনা (৳)</span>
            <p className="text-base sm:text-lg font-black text-rose-600 leading-relaxed truncate">
              ৳ {toBengaliNumber(totalPayable.toLocaleString())}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="কোম্পানি বা সাপ্লায়ারের নাম দিয়ে খুঁজুন..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-brand-purple outline-none shadow-2xs"
        />
      </div>

      {/* 3. Supplier List */}
      <div className="space-y-2">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider px-1">
          সাপ্লায়ারদের তালিকা
        </h4>

        <div className="space-y-2">
          {filteredSuppliers.map(supp => {
            const isMediChain = supp.is_medichain || supp.name.includes("MediChain");
            const payable = Number(supp.total_payable || 0);

            return (
              <div
                key={supp.id}
                className={`bg-white rounded-2xl p-3.5 border shadow-2xs space-y-2.5 transition-all ${
                  isMediChain ? "border-lime-300 ring-1 ring-lime-300/40 bg-gradient-to-r from-lime-50/20 via-white to-purple-50/20" : "border-purple-100/90"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        {supp.name}
                      </span>
                      {isMediChain && (
                        <span className="text-[10px] font-black text-slate-950 bg-brand-lime px-1.5 py-0.2 rounded-full border border-white flex items-center gap-0.5 shadow-2xs">
                          <ShieldCheck className="w-3 h-3 text-slate-900" />
                          অটো-সিঙ্কড
                        </span>
                      )}
                    </div>

                    {supp.company && (
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {supp.company}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block">দেনা / বকেয়া</span>
                    <span className={`text-xs sm:text-sm font-black ${payable > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      ৳ {toBengaliNumber(payable.toLocaleString())}
                    </span>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px]">
                  <span className="text-slate-500 font-medium truncate">
                    {supp.phone ? `ফোন: ${supp.phone}` : (supp.notes || "নিয়মিত সরবরাহকারী")}
                  </span>

                  <button
                    type="button"
                    onClick={onOpenNewPurchase}
                    className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60 cursor-pointer"
                  >
                    ক্রয় লিখুন ›
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Primary CTA matching বিক্রি tab */}
      <div className="sticky bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-purple-100 shadow-lg rounded-2xl">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ নতুন সাপ্লায়ার যুক্ত করুন</span>
        </button>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-5 border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">নতুন সাপ্লায়ার যুক্ত করুন</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} noValidate className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সাপ্লায়ারের নাম *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: স্কয়ার ফার্মাসিউটিক্যালস ডিপো"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ফার্মা কোম্পানি
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="যেমন: Square / Beximco / Incepta"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মোবাইল নম্বর / প্রতিনিধি ফোন
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পূর্বের বাকি / প্রারম্ভিক দেনা (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialPayable}
                  onChange={(e) => setInitialPayable(e.target.value)}
                  placeholder="০"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-purple"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-purple-700 text-white font-black text-xs cursor-pointer shadow-xs disabled:opacity-50"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
