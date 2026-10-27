import React, { useState, useMemo } from "react";
import { 
  X, 
  Search, 
  Check, 
  UserPlus, 
  MessageCircle, 
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle
} from "lucide-react";
import { KhataCustomer } from "../../types/khata";
import { toBengaliNumber } from "../../lib/utils";

interface PharmaKhataSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: KhataCustomer[];
  onAddSale: (saleData: {
    customerId?: string | null;
    customerName?: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Due' | 'Other';
    items?: Array<{ name: string; qty: number; unitPrice?: number }>;
    note?: string;
  }) => Promise<any>;
  onAddCustomer: (customerData: {
    name: string;
    phone: string;
    address?: string;
    initialDue?: number;
    notes?: string;
  }) => Promise<KhataCustomer>;
}

export default function PharmaKhataSaleModal({
  isOpen,
  onClose,
  customers,
  onAddSale,
  onAddCustomer
}: PharmaKhataSaleModalProps) {
  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<KhataCustomer | null>(null);
  const [isAnonymousCash, setIsAnonymousCash] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Inline New Customer form state
  const [isAddingCustomerInline, setIsAddingCustomerInline] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [inlineCustomerError, setInlineCustomerError] = useState<string | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Sale form state
  const [totalBill, setTotalBill] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'bKash' | 'Nagad' | 'Due'>('Cash');
  const [saleNote, setSaleNote] = useState("");
  const [saleError, setSaleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    );
  }, [customers, searchQuery]);

  // Auto-calculated due
  const numTotal = Number(totalBill) || 0;
  const numPaid = Number(paidAmount) || 0;
  const calculatedDue = Math.max(0, numTotal - numPaid);

  const handleSelectAnonymous = () => {
    setIsAnonymousCash(true);
    setSelectedCustomer(null);
    setPaymentMethod('Cash');
    setSaleError(null);
  };

  const handleSelectCustomer = (customer: KhataCustomer) => {
    setSelectedCustomer(customer);
    setIsAnonymousCash(false);
    setSaleError(null);
  };

  const handleQuickAddBill = (amt: number) => {
    const current = Number(totalBill) || 0;
    const nextVal = current + amt;
    setTotalBill(String(nextVal));
    setSaleError(null);
    if (isAnonymousCash) {
      setPaidAmount(String(nextVal));
    }
  };

  const handleTotalBillChange = (val: string) => {
    setTotalBill(val);
    setSaleError(null);
    if (isAnonymousCash) {
      setPaidAmount(val); // full payment for anonymous cash sale
    }
  };

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numTotal <= 0) {
      setSaleError("দয়া করে বিক্রির সঠিক মোট টাকার পরিমাণ লিখুন");
      return;
    }

    setSaleError(null);
    setIsSubmitting(true);
    try {
      await onAddSale({
        customerId: isAnonymousCash ? null : selectedCustomer?.id,
        customerName: isAnonymousCash ? "নগদ বিক্রি (নাম ছাড়া)" : selectedCustomer?.name,
        totalAmount: numTotal,
        paidAmount: numPaid,
        paymentMethod: calculatedDue > 0 && numPaid === 0 ? 'Due' : paymentMethod,
        note: saleNote
      });
      onClose();
    } catch (err) {
      console.error(err);
      setSaleError("বিক্রি সংরক্ষণ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline customer creation with Bengali validation
  const handleCreateCustomerInline = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newPhone.trim().replace(/[^0-9]/g, "");

    if (!newName.trim() || cleanPhone.length < 11) {
      setInlineCustomerError("কাস্টমারের নাম ও ১১ ডিজিটের মোবাইল নম্বর দিন");
      return;
    }

    setInlineCustomerError(null);
    setIsCreatingCustomer(true);

    try {
      const created = await onAddCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim()
      });
      setSelectedCustomer(created);
      setIsAnonymousCash(false);
      setIsAddingCustomerInline(false);
      setNewName("");
      setNewPhone("");
      setNewAddress("");
    } catch (err) {
      console.error(err);
      setInlineCustomerError("কাস্টমার সংরক্ষণ করতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন।");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // WhatsApp Due Reminder generator
  const sendWhatsAppReminder = (customer: KhataCustomer) => {
    if (!customer.phone || customer.total_due <= 0) return;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("88") ? cleanPhone : `88${cleanPhone}`;
    const textMsg = encodeURIComponent(
      `আসসালামু আলাইকুম ${customer.name} ভাই/ম্যাডাম। আপনার ফার্মেসির বকেয়া বাকি ৳${customer.total_due.toLocaleString()} টাকা। অনুগ্রহ করে সুবিধাজনক সময়ে পরিশোধ করার অনুরোধ রইল। ধন্যবাদ - MediChain Pharmacy.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${textMsg}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#F8F7FC] w-full max-w-lg h-[92vh] sm:h-auto max-h-[88vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-purple-100/90 transition-all">
        {/* Header */}
        <div className="bg-white px-4 py-3.5 border-b border-purple-100 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                নতুন বিক্রি লিখুন
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                ক্যাশ বা বাকিতে বিক্রি নথিভুক্ত করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Main Sale Entry Form (noValidate disables browser-native English tooltips) */}
          <form onSubmit={handleSaveSale} noValidate className="space-y-4">
            {saleError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{saleError}</span>
              </div>
            )}

            {/* Customer Selector Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800">
                  কাস্টমার বাছাই করুন
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustomerInline(!isAddingCustomerInline);
                    setInlineCustomerError(null);
                  }}
                  className="text-[11px] font-black text-brand-purple hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isAddingCustomerInline ? "বাতিল করুন" : "+ নতুন কাস্টমার"}
                </button>
              </div>

              {/* Inline Expandable Form for Adding New Customer without a second modal */}
              {isAddingCustomerInline && (
                <div className="bg-purple-50/90 border border-purple-200/90 rounded-2xl p-3.5 space-y-3 animate-fade-in shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-purple-700" />
                      নতুন কাস্টমার নিবন্ধন
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomerInline(false);
                        setInlineCustomerError(null);
                      }}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {inlineCustomerError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{inlineCustomerError}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        কাস্টমারের নাম *
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => {
                          setNewName(e.target.value);
                          setInlineCustomerError(null);
                        }}
                        placeholder="যেমন: আব্দুর রহিম (মাস্টার পাড়া)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-brand-purple outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        মোবাইল নম্বর * (১১ ডিজিট, তাগাদার জন্য প্রয়োজনীয়)
                      </label>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => {
                          setNewPhone(e.target.value);
                          setInlineCustomerError(null);
                        }}
                        placeholder="01XXXXXXXXX"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-brand-purple outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        ঠিকানা বা এলাকা (ঐচ্ছিক)
                      </label>
                      <input
                        type="text"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="যেমন: হাসপাতাল রোড, দোকান নং-৩"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-brand-purple outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomerInline(false);
                        setInlineCustomerError(null);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCustomerInline}
                      disabled={isCreatingCustomer}
                      className="flex-1 py-2 px-3 rounded-xl bg-brand-purple hover:bg-purple-700 text-white font-black text-xs cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isCreatingCustomer ? "সংরক্ষণ হচ্ছে..." : "কাস্টমার সংরক্ষণ করুন"}
                    </button>
                  </div>
                </div>
              )}

              {/* Fast Option: নগদ বিক্রি (নাম ছাড়া) */}
              <div
                onClick={handleSelectAnonymous}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isAnonymousCash
                    ? "bg-emerald-50/90 border-emerald-500 shadow-2xs ring-1 ring-emerald-500/30"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                    isAnonymousCash ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                      নগদ বিক্রি (নাম ছাড়া)
                    </p>
                    <p className="text-[10px] text-slate-500">
                      কাউন্টার ওয়াক-ইন কাস্টমারদের দ্রুত ক্যাশ এন্ট্রি
                    </p>
                  </div>
                </div>

                {isAnonymousCash && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Customer Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="নাম বা মোবাইল নম্বর দিয়ে কাস্টমার খুঁজুন..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-brand-purple outline-none"
                />
              </div>

              {/* Scrollable Customer List */}
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5">
                {filteredCustomers.map(cust => {
                  const isSelected = !isAnonymousCash && selectedCustomer?.id === cust.id;
                  const hasDue = (cust.total_due || 0) > 0;

                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        isSelected
                          ? "bg-purple-50/90 border-brand-purple shadow-2xs"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-extrabold text-slate-900 truncate">{cust.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{cust.phone}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasDue ? (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                            বাকি: ৳{toBengaliNumber(cust.total_due.toLocaleString())}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            পরিশোধিত
                          </span>
                        )}

                        {hasDue && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              sendWhatsAppReminder(cust);
                            }}
                            title="হোয়াটসঅ্যাপে তাগাদা পাঠান"
                            className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Bill & Payment Inputs */}
            <div className="bg-white p-3.5 rounded-2xl border border-purple-100/90 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-800">
                    মোট বিল (৳) *
                  </label>
                  {/* Quick + Buttons */}
                  <div className="flex items-center gap-1">
                    {[50, 100, 200, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAddBill(amt)}
                        className="px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-extrabold cursor-pointer transition-colors"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="number"
                  min="1"
                  value={totalBill}
                  onChange={(e) => handleTotalBillChange(e.target.value)}
                  placeholder="০"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-lg font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-purple outline-none"
                />
              </div>

              {/* Paid Amount */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  পরিশোধের পরিমাণ (ক্যাশ বা ডিজিটাল)
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="০"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base font-black text-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Live Due Calculation Strip */}
              {calculatedDue > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>বাকি হিসেবে যোগ হবে:</span>
                  <span className="font-black text-amber-700 text-sm">
                    ৳ {toBengaliNumber(calculatedDue.toLocaleString())}
                  </span>
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  পেমেন্ট মাধ্যম
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'bKash', 'Nagad'] as const).map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        paymentMethod === pm
                          ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {pm === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                      {pm === 'bKash' && <Smartphone className="w-3.5 h-3.5" />}
                      {pm === 'Nagad' && <CreditCard className="w-3.5 h-3.5" />}
                      <span>{pm === 'Cash' ? 'ক্যাশ' : pm}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Note */}
              <div>
                <input
                  type="text"
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  placeholder="ওষুধ বা নোট (যেমন: ২ পাতা নাপা, প্রেসক্রিপশন নং)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-lime to-lime-500 hover:from-lime-500 hover:to-lime-600 text-slate-950 font-black text-sm shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {numTotal > 0 
                  ? `বিক্রি সম্পন্ন করুন (৳${toBengaliNumber(numTotal.toLocaleString())})`
                  : "বিক্রি সম্পন্ন করুন"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
