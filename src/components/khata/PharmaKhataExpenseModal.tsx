import React, { useState } from "react";
import { X, ArrowUpRight, Check, Banknote, Smartphone, CreditCard } from "lucide-react";
import { toBengaliNumber } from "../../lib/utils";

interface PharmaKhataExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: {
    category: string;
    amount: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Other';
    note?: string;
  }) => Promise<any>;
}

const EXPENSE_CATEGORIES = [
  "চা ও নাস্তা",
  "বিদ্যুৎ বিল",
  "দোকান ভাড়া",
  "স্টাফ বেতন",
  "পরিবহন / যাতায়াত",
  "ওষুধ ড্যামেজ / ক্ষতি",
  "কাউন্টার মেরামত",
  "অন্যান্য ব্যয়"
];

export default function PharmaKhataExpenseModal({
  isOpen,
  onClose,
  onAddExpense
}: PharmaKhataExpenseModalProps) {
  const [category, setCategory] = useState("চা ও নাস্তা");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'bKash' | 'Nagad'>('Cash');
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(amount) || 0;
    if (numAmt <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddExpense({
        category,
        amount: numAmt,
        paymentMethod,
        note
      });
      onClose();
      setAmount("");
      setNote("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 border border-purple-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">দোকানের ব্যয় লিখুন</h3>
              <p className="text-[11px] text-slate-500">দৈনিক খরচ সংরক্ষণ করুন</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Quick Categories */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">ব্যয়ের খাত</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {EXPENSE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    category === cat
                      ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              টাকার পরিমাণ (৳) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="০"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-black text-rose-600 outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">পেমেন্ট মাধ্যম</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Cash', 'bKash', 'Nagad'] as const).map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    paymentMethod === pm
                      ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {pm === 'Cash' ? 'ক্যাশ' : pm}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="বিস্তারিত নোট (ঐচ্ছিক)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-xs disabled:opacity-50"
            >
              ব্যয় যুক্ত করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
