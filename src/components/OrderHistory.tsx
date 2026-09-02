import React, { useState, useEffect } from "react";
import { ListFilter, Receipt, ArrowRight, CornerDownLeft, RefreshCw, Eye, Check, AlertCircle, XCircle, Phone } from "lucide-react";
import { Order } from "../types";
import { orderService } from "../services";
import { formatRefId, generateOrderOTP } from "../lib/utils";
import MediChainLogo from "./MediChainLogo";
import ModernInvoiceModal from "./ModernInvoiceModal";

interface OrderHistoryProps {
  onTrackOrder: (orderId: string) => void;
  onRefreshCart: () => void;
  onTriggerTab: (tab: string) => void;
}

export default function OrderHistory({ onTrackOrder, onRefreshCart, onTriggerTab }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);
  const [showReturnModal, setShowReturnModal] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchOrders = async () => {
    try {
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleReorder = async (orderId: string) => {
    setLoading(true);
    try {
      await orderService.reorder(orderId);
      onRefreshCart();
      onTriggerTab("cart");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReturn = async () => {
    if (!showReturnModal) return;
    try {
      await orderService.requestReturn(showReturnModal.id, returnReason);
      setSuccessMsg("Return requested successfully! Refreshing database...");
      setTimeout(() => {
        setSuccessMsg("");
        setShowReturnModal(null);
        setReturnReason("");
        fetchOrders();
      }, 1500);
    } catch (err) {
      console.error(err);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      Pending: { label: "প্রক্রিয়াধীন", cls: "bg-slate-50 text-slate-700 border-slate-200" },
      Confirmed: { label: "গৃহীত", cls: "bg-blue-50 text-blue-700 border-blue-100" },
      Processing: { label: "যাচাই চলছে", cls: "bg-amber-50 text-amber-700 border-amber-100" },
      Packed: { label: "প্যাকিং সম্পন্ন", cls: "bg-purple-50 text-purple-700 border-purple-100" },
      "Out for Delivery": { label: "পথে আছেন", cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
      Delivered: { label: "ডেলিভারি সম্পন্ন", cls: "bg-emerald-50 text-emerald-800 border-emerald-100" },
      Completed: { label: "সম্পন্ন", cls: "bg-emerald-50 text-emerald-800 border-emerald-100" },
      Cancelled: { label: "বাতিল", cls: "bg-rose-50 text-rose-700 border-rose-100" }
    };
    const badge = map[status] || { label: status, cls: "bg-slate-50 text-slate-500" };
    return (
      <span className={`text-[9px] font-black border px-2 py-0.5 rounded uppercase tracking-wider ${badge.cls}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="h-full bg-brand-bg select-none overflow-y-auto px-4 sm:px-6 pt-6 pb-32 space-y-4 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-black text-brand-charcoal">অর্ডার ইতিহাস</h2>
        <span className="text-[10px] text-slate-400 font-bold uppercase font-mono bg-white px-2.5 py-1 rounded-xl border border-slate-100 shadow-2xs">
          মোট অর্ডার: {orders.length} টি
        </span>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold p-3 rounded-2xl flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-2xs">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 mb-3">
            <ListFilter className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-700">এখনো কোনো অর্ডার নেই</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            আপনার করা সব পাইকারি অর্ডারের তথ্য ও ডেলিভারি স্ট্যাটাস এখানে দেখতে পাবেন।
          </p>
        </div>
      ) : (
        orders.map(order => (
          <div
            key={order.id}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs hover:shadow-md transition-all space-y-3 relative overflow-hidden"
          >
            {/* Status & ID Line */}
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">অর্ডার নম্বর</span>
                <span className="text-xs sm:text-sm font-black text-brand-charcoal font-mono">{formatRefId(order.id, "ORD")}</span>
              </div>
              <div className="text-right">
                {getStatusBadge(order.status)}
              </div>
            </div>

            {/* 4-Stage Horizontal Progress Tracker */}
            {order.status !== "Cancelled" && (
              <div className="py-2.5 px-2 bg-slate-50/70 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between relative px-3">
                  {/* Background line */}
                  <div className="absolute top-[7px] left-5 right-5 h-0.5 bg-slate-200/80 z-0" />
                  {/* Progress filler line */}
                  <div 
                    className="absolute top-[7px] left-5 h-0.5 bg-brand-purple z-0 transition-all duration-500" 
                    style={{
                      width: order.status === "Delivered" || order.status === "Completed" ? "calc(100% - 40px)" :
                             order.status === "Out for Delivery" ? "66%" :
                             order.status === "Packed" ? "33%" : "0px"
                    }}
                  />

                  {/* 4 dots */}
                  {[
                    { label: "গৃহীত", active: ["Confirmed", "Processing", "Packed", "Out for Delivery", "Delivered", "Completed"].includes(order.status) },
                    { label: "প্যাকিং", active: ["Packed", "Out for Delivery", "Delivered", "Completed"].includes(order.status) },
                    { label: "পথে আছেন", active: ["Out for Delivery", "Delivered", "Completed"].includes(order.status) },
                    { label: "ডেলিভারি", active: ["Delivered", "Completed"].includes(order.status) }
                  ].map((st, sIdx) => (
                    <div key={sIdx} className="flex flex-col items-center z-10 relative">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                        st.active ? "bg-brand-purple border-brand-purple text-white scale-110" : "bg-white border-slate-200"
                      }`}>
                        {st.active && <div className="w-1.5 h-1.5 bg-brand-lime rounded-full" />}
                      </div>
                      <span className={`text-[8.5px] font-extrabold mt-1 ${st.active ? "text-brand-purple" : "text-slate-400"}`}>
                        {st.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rider Handover OTP & Secure Actions */}
            {order.status === "Out for Delivery" && (
              <div className="bg-brand-purple/5 border border-brand-purple/15 p-3 rounded-2xl flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
                <div>
                  <span className="text-[8px] text-brand-purple font-black uppercase tracking-wider block">🔒 ডেলিভারি ওটিপি পিন</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="bg-brand-purple text-white font-mono font-black text-xs px-2.5 py-0.5 rounded shadow-sm">
                      OTP: {order.handoverOtp || generateOrderOTP(order.id)}
                    </span>
                    <span className="text-[8.5px] text-slate-500 font-semibold">ওষুধ বুঝে পাওয়ার পর রাইডারকে দিন</span>
                  </div>
                </div>
                <a
                  href="tel:+880191234567"
                  className="bg-brand-lime hover:bg-brand-lime-dark text-slate-900 px-3 py-1.5 rounded-xl text-[9px] font-black flex items-center gap-1 hover:shadow-xs transition-all cursor-pointer flex-shrink-0"
                >
                  <Phone className="w-3 h-3" />
                  রাইডারকে কল দিন
                </a>
              </div>
            )}

            {/* Content summary */}
            <div onClick={() => onTrackOrder(order.id)} className="cursor-pointer">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                অর্ডার করা ওষুধসমূহ
              </div>
              <div className="space-y-1">
                {order.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs font-medium text-slate-700">
                    <span className="truncate pr-2">{item.name} ({item.quantity} বক্স)</span>
                    <span className="font-mono shrink-0">৳{item.subtotal?.toLocaleString()}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="text-[10px] text-brand-purple font-bold">
                    + আরও {order.items.length - 3} টি ওষুধ
                  </div>
                )}
              </div>
            </div>

            {/* Totals & Delivery Date */}
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[9px] font-bold">মোট বিল</span>
                <span className="font-black text-brand-charcoal font-mono">৳{order.totalAmount?.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[9px] font-bold">অর্ডারের তারিখ</span>
                <span className="font-mono text-slate-600 font-bold">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Historical Actions */}
            <div className="flex gap-2 pt-1 border-t border-slate-100">
              {/* Track / details */}
              <button
                onClick={() => onTrackOrder(order.id)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                ট্র্যাকিং দেখুন
              </button>

              {/* View Invoice */}
              <button
                onClick={() => setSelectedInvoice(order)}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Receipt className="w-3.5 h-3.5 text-brand-purple" />
                চালান / রসিদ
              </button>

              {/* Reorder */}
              <button
                disabled={loading}
                onClick={() => handleReorder(order.id)}
                className="flex-1 bg-brand-lime hover:bg-brand-lime-dark text-slate-900 py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                পুনরায় অর্ডার
              </button>
            </div>

            {/* Cancel Request button (Pending or Confirmed order) */}
            {(order.status === "Pending" || order.status === "Confirmed") && (
              <button
                onClick={async () => {
                  try {
                    await orderService.cancelOrder(order.id);
                    setSuccessMsg("অর্ডারটি সফলভাবে বাতিল করা হয়েছে।");
                    setTimeout(() => setSuccessMsg(""), 3000);
                    fetchOrders();
                  } catch (err) {
                    setSuccessMsg("অর্ডার বাতিল করা সম্ভব হয়নি।");
                    setTimeout(() => setSuccessMsg(""), 3000);
                  }
                }}
                className="w-full text-center text-[10px] font-extrabold text-rose-500 bg-rose-50 hover:bg-rose-100 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all mt-2"
              >
                <XCircle className="w-3 h-3" />
                অর্ডার বাতিল করুন
              </button>
            )}

            {/* Return Request button (Delivered order and not already returned) */}
            {order.status === "Delivered" && !order.hasReturnRequested && (
              <button
                onClick={() => setShowReturnModal(order)}
                className="w-full text-center text-[10px] font-extrabold text-brand-purple bg-brand-purple/5 hover:bg-brand-purple/10 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <CornerDownLeft className="w-3 h-3" />
                ওষুধ ফেরত বা পরিবর্তনের আবেদন
              </button>
            )}

            {order.hasReturnRequested && (
              <div className="bg-rose-50 border border-rose-100 p-2 rounded-xl text-[10px] flex justify-between items-center">
                <div>
                  <span className="font-extrabold text-rose-600 block uppercase">ফেরতের অবস্থা: {order.returnStatus}</span>
                  <span className="text-slate-500 italic">"{order.returnReason}"</span>
                </div>
                {order.returnStatus === "Pending" && (
                  <button
                    onClick={async () => {
                      await orderService.approveReturn(order.id);
                      fetchOrders();
                    }}
                    className="bg-brand-lime text-slate-900 font-extrabold px-2 py-1 rounded-md text-[9px] cursor-pointer"
                  >
                    অনুমোদন করুন (ডেমো)
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Official A4 Digital Invoice Modal View */}
      {selectedInvoice && (
        <ModernInvoiceModal
          order={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Return dispute popup */}
      {showReturnModal && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-xs text-slate-800 animate-scale-up shadow-2xl relative">
            <button
              onClick={() => setShowReturnModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
            >
              &times;
            </button>

            <h3 className="text-sm font-black text-brand-charcoal mb-2 mt-1">ওষুধ ফেরত বা অভিযোগ জানান</h3>
            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
              মেডিচেইন ক্ষতিগ্রস্ত বা মেয়াদোত্তীর্ণ ওষুধ ফেরতের সুযোগ দেয়। অর্ডার #{showReturnModal.id} এর সমস্যার কারণ লিখুন:
            </p>

            {successMsg && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl mb-3 font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <textarea
              rows={3}
              placeholder="যেমন: প্যাকেটের ক্ষতি হয়েছে বা মেয়াদ ১ মাসের কম রয়েছে..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:border-brand-purple mb-4 font-medium"
            />

            <button
              onClick={handleRequestReturn}
              disabled={!returnReason}
              className="w-full bg-brand-purple text-white py-3 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              আবেদন জমা দিন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
