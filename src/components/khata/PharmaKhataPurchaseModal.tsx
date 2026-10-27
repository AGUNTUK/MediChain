import React, { useState } from "react";
import { X, ShoppingBag, Check, Building2 } from "lucide-react";
import { KhataSupplier } from "../../types/khata";
import { toBengaliNumber } from "../../lib/utils";

interface PharmaKhataPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: KhataSupplier[];
  onAddPurchase: (purchase: {
    supplierId?: string | null;
    supplierName?: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: 'Cash' | 'bKash' | 'Nagad' | 'Due' | 'Other';
    note?: string;
  }) => Promise<any>;
}

export default function PharmaKhataPurchaseModal({
  isOpen,
  onClose,
  suppliers,
  onAddPurchase
}: PharmaKhataPurchaseModalProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || "");
  const [customSupplierName, setCustomSupplierName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'bKash' | 'Nagad' | 'Due'>('Cash');
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const numTotal = Number(totalAmount) || 0;
  const numPaid = Number(paidAmount) || 0;
  const calculatedDue = Math.max(0, numTotal - numPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numTotal <= 0) return;

    setIsSubmitting(true);
    try {
      const selectedSupp = suppliers.find(s => s.id === selectedSupplierId);
      await onAddPurchase({
        supplierId: selectedSupplierId === "custom" ? null : selectedSupplierId,
        supplierName: selectedSupplierId === "custom" ? customSupplierName || "অন্যান্য সাপ্লায়ার" : selectedSupp?.name,
        totalAmount: numTotal,
        paidAmount: numPaid,
        paymentMethod: calculatedDue > 0 && numPaid === 0 ? 'Due' : paymentMethod,
        note
      });
      onClose();
      setTotalAmount("");
      setPaidAmount("");
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
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">ওষুধ ক্রয় লিখুন</h3>
              <p className="text-[11px] text-slate-500">সাপ্লায়ার ইনভয়েস সংরক্ষণ</p>
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
          {/* Supplier Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">সাপ্লায়ার বাছাই করুন</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.company ? `(${s.company})` : ""}
                </option>
              ))}
              <option value="custom">+ নতুন / অন্যান্য সাপ্লায়ার</option>
            </select>
          </div>

          {selectedSupplierId === "custom" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">সাপ্লায়ারের নাম</label>
              <input
                type="text"
                required
                value={customSupplierName}
                onChange={(e) => setCustomSupplierName(e.target.value)}
                placeholder="যেমন: অপসোনিন ফার্মা ডিপো"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
              />
            </div>
          )}

          {/* Total Bill */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">মোট বিল (৳) *</label>
            <input
              type="number"
              min="1"
              required
              value={totalAmount}
              onChange={(e) => {
                setTotalAmount(e.target.value);
                setPaidAmount(e.target.value);
              }}
              placeholder="০"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-black text-indigo-700 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Paid Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">পরিশোধের পরিমাণ (৳)</label>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="০"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-900 outline-none"
            />
          </div>

          {calculatedDue > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex justify-between items-center text-amber-900">
              <span className="font-bold">সাপ্লায়ার দেনা হিসেবে যোগ হবে:</span>
              <span className="font-black text-amber-700 text-sm">৳ {toBengaliNumber(calculatedDue.toLocaleString())}</span>
            </div>
          )}

          {/* Note */}
          <div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ইনভয়েস বা মেমো নম্বর (ঐচ্ছিক)"
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
              disabled={isSubmitting || !totalAmount}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer shadow-xs disabled:opacity-50"
            >
              ক্রয় সম্পন্ন করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
