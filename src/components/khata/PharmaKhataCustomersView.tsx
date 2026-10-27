import React, { useState } from "react";
import { 
  Users, 
  Search, 
  MessageCircle, 
  Phone, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ArrowDownRight,
  X,
  CreditCard,
  Banknote,
  Smartphone
} from "lucide-react";
import { KhataCustomer } from "../../types/khata";
import { toBengaliNumber } from "../../lib/utils";

interface PharmaKhataCustomersViewProps {
  customers: KhataCustomer[];
  onAddCustomer: (customer: {
    name: string;
    phone: string;
    address?: string;
    initialDue?: number;
    notes?: string;
  }) => Promise<any>;
  onCollectDue: (data: {
    customerId: string;
    amount: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Other';
    note?: string;
  }) => Promise<any>;
}

export default function PharmaKhataCustomersView({
  customers,
  onAddCustomer,
  onCollectDue
}: PharmaKhataCustomersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyDueFilter, setOnlyDueFilter] = useState(false);

  // Collect Due modal state
  const [collectTarget, setCollectTarget] = useState<KhataCustomer | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState<'Cash' | 'bKash' | 'Nagad'>('Cash');
  const [collectNote, setCollectNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Customer modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [initialDue, setInitialDue] = useState("");

  const totalDueAll = customers.reduce((sum, c) => sum + Number(c.total_due || 0), 0);
  const dueCustomersCount = customers.filter(c => (c.total_due || 0) > 0).length;

  const filteredCustomers = customers.filter(c => {
    if (onlyDueFilter && (c.total_due || 0) <= 0) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const sendWhatsAppReminder = (customer: KhataCustomer) => {
    if (!customer.phone || customer.total_due <= 0) return;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("88") ? cleanPhone : `88${cleanPhone}`;
    const textMsg = encodeURIComponent(
      `আসসালামু আলাইকুম ${customer.name} ভাই/ম্যাডাম। আপনার ফার্মেসির বকেয়া বাকি ৳${customer.total_due.toLocaleString()} টাকা। অনুগ্রহ করে সুবিধাজনক সময়ে পরিশোধ করার অনুরোধ রইল। ধন্যবাদ - MediChain Pharmacy.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${textMsg}`, "_blank");
  };

  const handleExecuteCollectDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectTarget || !collectAmount) return;

    setIsSubmitting(true);
    try {
      await onCollectDue({
        customerId: collectTarget.id,
        amount: Number(collectAmount) || 0,
        paymentMethod: collectMethod,
        note: collectNote
      });
      setCollectTarget(null);
      setCollectAmount("");
      setCollectNote("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim(),
        initialDue: Number(initialDue) || 0
      });
      setShowAddCustomerModal(false);
      setNewName("");
      setNewPhone("");
      setNewAddress("");
      setInitialDue("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      {/* 1. Header Card with Dues Overview */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-brand-purple" />
            কাস্টমার ও বাকি খাতা
          </span>

          <button
            type="button"
            onClick={() => setShowAddCustomerModal(true)}
            className="text-[11px] font-black text-brand-purple hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + নতুন কাস্টমার
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100">
            <span className="text-[11px] font-bold text-amber-800 leading-snug block">মোট বকেয়া বাকি</span>
            <p className="text-base sm:text-lg font-black text-amber-700 leading-relaxed truncate">
              ৳ {toBengaliNumber(totalDueAll.toLocaleString())}
            </p>
          </div>

          <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-100">
            <span className="text-[11px] font-bold text-purple-800 leading-snug block">বাকি কাস্টমার</span>
            <p className="text-base sm:text-lg font-black text-purple-700 leading-relaxed truncate">
              {toBengaliNumber(dueCustomersCount)} জন / মোট {toBengaliNumber(customers.length)}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-brand-purple outline-none shadow-2xs"
          />
        </div>

        {/* Toggle Only Dues Filter */}
        <button
          type="button"
          onClick={() => setOnlyDueFilter(!onlyDueFilter)}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 shadow-2xs ${
            onlyDueFilter
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          শুধু বাকি
        </button>
      </div>

      {/* 3. Customer List */}
      <div className="space-y-2">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider px-1">
          কাস্টমার তালিকা ({toBengaliNumber(filteredCustomers.length)})
        </h4>

        <div className="space-y-2">
          {filteredCustomers.map(cust => {
            const hasDue = (cust.total_due || 0) > 0;

            return (
              <div
                key={cust.id}
                className="bg-white rounded-2xl p-3.5 border border-purple-100 hover:border-purple-200 shadow-2xs space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                      {cust.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {cust.phone} {cust.address ? `• ${cust.address}` : ""}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block">বকেয়া বাকি</span>
                    <span className={`text-xs sm:text-sm font-black ${hasDue ? "text-amber-700" : "text-emerald-600"}`}>
                      {hasDue ? `৳ ${toBengaliNumber(cust.total_due.toLocaleString())}` : "পরিশোধিত"}
                    </span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px]">
                  <span className="text-[10px] text-slate-400 truncate">
                    {cust.notes || "নিয়মিত ক্রেতা"}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* WhatsApp Reminder Button (তাগাদা) */}
                    {hasDue && (
                      <button
                        type="button"
                        onClick={() => sendWhatsAppReminder(cust)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>তাগাদা</span>
                      </button>
                    )}

                    {/* Collect Due Button (বাকি আদায়) */}
                    {hasDue && (
                      <button
                        type="button"
                        onClick={() => {
                          setCollectTarget(cust);
                          setCollectAmount(String(cust.total_due));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 text-purple-600" />
                        <span>বাকি আদায়</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collect Due Modal */}
      {collectTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">বাকি আদায় লিখুন</h3>
                <p className="text-[11px] text-slate-500">{collectTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setCollectTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteCollectDue} className="space-y-3.5">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex justify-between items-center">
                <span className="text-amber-800 font-bold">মোট বকেয়া:</span>
                <span className="font-black text-amber-700 text-sm">
                  ৳ {toBengaliNumber(collectTarget.total_due.toLocaleString())}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  আদায়ের পরিমাণ (৳) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={collectTarget.total_due}
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-black text-emerald-700 outline-none focus:ring-1 focus:ring-brand-purple"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">মাধ্যম</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Cash', 'bKash', 'Nagad'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCollectMethod(m)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        collectMethod === m
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {m === 'Cash' ? 'ক্যাশ' : m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCollectTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !collectAmount}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-lime to-lime-500 text-slate-950 font-black text-xs cursor-pointer shadow-xs disabled:opacity-50"
                >
                  আদায় সম্পন্ন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">নতুন কাস্টমার যোগ করুন</h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">কাস্টমারের নাম *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="যেমন: আব্দুর রহিম"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ঠিকানা / এলাকা</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="যেমন: হাসপাতাল মোড়"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">পূর্বের বাকি (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={initialDue}
                  onChange={(e) => setInitialDue(e.target.value)}
                  placeholder="০"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-purple"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newName.trim()}
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
