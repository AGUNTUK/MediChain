import React, { useState, useEffect } from "react";
import { ArrowLeft, MapPin, CreditCard, ShieldCheck, RefreshCw, AlertCircle, Check } from "lucide-react";
import { Pharmacy } from "../types";
import { orderService } from "../services";
import StockAlertButton from "./StockAlertButton";

interface CheckoutProps {
  onBackToCart: () => void;
  onOrderPlaced: (orderId: string) => void;
  pharmacy: Pharmacy | null;
}

export default function Checkout({ onBackToCart, onOrderPlaced, pharmacy }: CheckoutProps) {
  const [deliverySlot, setDeliverySlot] = useState<string>("Morning Dispatch (09:00 AM - 01:00 PM)");
  const [notes, setNotes] = useState("");
  const [cartSummary, setCartSummary] = useState<any>(null);
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const [data, ordersData] = await Promise.all([
          orderService.getCart(),
          orderService.getOrders()
        ]);
        setCartSummary(data);

        const completedOrders = ordersData
          .filter(o => o.status === 'Delivered' || o.status === 'Completed' || o.paymentStatus === 'Paid')
          .reduce((sum, order) => sum + order.totalAmount, 0);
        setTotalPurchased(completedOrders);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSummary();
  }, []);

  const handlePlaceOrder = async () => {
    if (!cartSummary) return;

    setLoading(true);
    setError("");

    try {
      const finalNotes = [
        `Slot: ${deliverySlot}`,
        notes ? `Instructions: ${notes}` : ""
      ].filter(Boolean).join(" | ");

      const data = await orderService.createOrder({
        paymentMethod: "Cash on Delivery",
        notes: finalNotes,
        paymentStatus: "Pending",
        ...({ deliveryAddress: pharmacy?.address || "Dhanmondi, Dhaka" } as any)
      } as any);

      onOrderPlaced(data.orderId);
    } catch (err: any) {
      if (err.fields) {
        setError(Object.values(err.fields).join(" "));
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to place order.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!cartSummary) {
    return (
      <div className="w-full h-full bg-brand-bg flex items-center justify-center p-6">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between select-none overflow-y-auto relative">
      {/* Checkout Area */}
      <div className="p-4 space-y-4">
        {/* Navigation title */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToCart}
            className="p-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h2 className="text-sm font-black text-brand-charcoal">অর্ডার নিশ্চিতকরণ (Checkout)</h2>
        </div>

        {/* Out of stock warning banner if cart contains stockout items */}
        {cartSummary.items && cartSummary.items.some(({ product }: any) => product.availableStock !== undefined && product.availableStock <= 0) && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-2 text-rose-800">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-rose-900">স্টক সতর্কতা (Out of Stock Notice)</h4>
                <p className="text-[11px] font-bold text-rose-700 mt-0.5 leading-relaxed">
                  বর্তমানে স্টক শেষ। নতুন স্টক আসার তাৎক্ষণিক নোটিফিকেশন পেতে 'স্টক এলার্ট' বাটনে ট্যাপ করুন।
                </p>
              </div>
            </div>
            <div className="divide-y divide-rose-100 bg-white/80 rounded-xl p-2.5 space-y-1.5">
              {cartSummary.items
                .filter(({ product }: any) => product.availableStock !== undefined && product.availableStock <= 0)
                .map(({ product }: any) => (
                  <div key={product.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-800 truncate">{product.name} <span className="text-[10px] font-normal text-slate-400">({product.strength})</span></span>
                    <StockAlertButton productId={product.id} productName={product.name} compact={true} />
                  </div>
                ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-semibold leading-relaxed">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Delivery Address Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-purple" />
              ফার্মেসির ডেলিভারি ঠিকানা
            </h3>
            {pharmacy?.verificationStatus === "Approved" && (
              <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                অনুমোদিত ফার্মেসি
              </span>
            )}
          </div>
          <div className="text-xs">
            <div className="font-bold text-slate-800">{pharmacy?.pharmacyName}</div>
            <p className="text-slate-500 mt-1 leading-relaxed">{pharmacy?.address}, {pharmacy?.city}</p>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">
              মোবাইল নম্বর: {pharmacy?.phone}
            </div>
          </div>
        </div>

        {/* Delivery Time Slot Picker */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-2.5">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-purple" />
            ডিপো ডেলিভারির সময় বেছে নিন
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              deliverySlot.includes("Morning")
                ? "border-brand-purple bg-brand-purple/5"
                : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
            }`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="slot"
                  checked={deliverySlot.includes("Morning")}
                  onChange={() => setDeliverySlot("Morning Dispatch (09:00 AM - 01:00 PM)")}
                  className="accent-brand-purple cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black text-slate-900 block">সকালের ডেলিভারি</span>
                  <span className="text-[9px] text-slate-500 font-medium">সকাল ০৯:০০ – দুপুর ০১:০০</span>
                </div>
              </div>
              <span className="text-[8px] bg-indigo-100 text-brand-purple font-black px-2 py-0.5 rounded uppercase">দ্রুততম</span>
            </label>

            <label className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              deliverySlot.includes("Evening")
                ? "border-brand-purple bg-brand-purple/5"
                : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
            }`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="slot"
                  checked={deliverySlot.includes("Evening")}
                  onChange={() => setDeliverySlot("Evening Restock (04:00 PM - 08:00 PM)")}
                  className="accent-brand-purple cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black text-slate-900 block">বিকালের ডেলিভারি</span>
                  <span className="text-[9px] text-slate-500 font-medium">বিকাল ০৪:০০ – রাত ০৮:০০</span>
                </div>
              </div>
              <span className="text-[8px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded uppercase">স্ট্যান্ডার্ড</span>
            </label>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-3">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-brand-purple" />
            পেমেন্ট পদ্ধতি নির্বাচন করুন
          </h3>

          <div className="space-y-2">
            {/* Cash on Delivery */}
            <label className="flex items-center justify-between p-3.5 rounded-xl border-2 border-brand-purple bg-brand-purple/5 transition-all cursor-pointer">
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <input
                  type="radio"
                  name="payment"
                  checked={true}
                  readOnly
                  className="accent-brand-purple cursor-pointer"
                />
                <div className="text-left">
                  <span>ক্যাশ অন ডেলিভারি (নগদ টাকা)</span>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-medium leading-tight">
                    ডেলিভারি রাইডারের কাছ থেকে পণ্য বুঝে পেয়ে নগদ পরিশোধ করুন।
                  </p>
                </div>
              </div>
              <div className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                সবচেয়ে সহজ
              </div>
            </label>
          </div>
        </div>

        {/* Order Notes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
            ডিপো ও রাইডারের জন্য বিশেষ নির্দেশনা (ঐচ্ছিক)
          </label>
          <textarea
            rows={2}
            placeholder="যেমন: দুপুর ২টার আগে ডেলিভারি দিন, অথবা দোকানে না পেলে ফোনে জানান..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:border-brand-purple font-medium"
          />
        </div>
      </div>

      {/* Bill summary and final submit */}
      <div className="p-4 bg-white border-t border-slate-100 rounded-t-3xl shadow-xl flex-shrink-0 mt-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-[9px] text-slate-400 block uppercase font-mono">সর্বমোট প্রদেয় বিল</span>
            <span className="text-lg font-black text-brand-purple font-mono">
              ৳{cartSummary.totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
              মোট সাশ্রয়: ৳{cartSummary.totalSavings.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 bg-brand-lime hover:bg-brand-lime-dark text-slate-900 hover:shadow-lg hover:shadow-brand-lime/20"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>অর্ডার নিশ্চিত করুন (৳{cartSummary.totalAmount.toLocaleString()})</span>
              <ShieldCheck className="w-4 h-4 shrink-0" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

