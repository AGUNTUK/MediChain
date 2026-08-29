import React, { useState, useEffect } from "react";
import { ArrowLeft, Check, Compass, Truck, RefreshCw, Layers, Calendar, Phone, KeyRound } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { Order, OrderStatus } from "../types";
import { orderService } from "../services";
import { formatRefId } from "../lib/utils";

interface OrderTrackingProps {
  orderId: string;
  userRole?: string;
  onBack: () => void;
  onRefreshStats: () => void;
}

export default function OrderTracking({ orderId, userRole, onBack, onRefreshStats }: OrderTrackingProps) {
  const [order, setOrder] = useState<Order | null>(null);

  const fetchOrder = async () => {
    try {
      const data = await orderService.getOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Socket.io initialization for real-time tracking
    const socket = io(); // Connects to the same host/port

    socket.on("connect", () => {
      socket.emit("join_order_room", orderId);
    });

    socket.on("order_status_updated", (updatedOrder: Order) => {
      setOrder(updatedOrder);
      onRefreshStats(); // Optional: to refresh any parent level notifications
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  if (!order) {
    return (
      <div className="w-full h-full bg-brand-bg flex items-center justify-center p-6">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  const steps: Array<{ key: OrderStatus; label: string; desc: string }> = [
    { key: "Pending", label: "অর্ডার প্রক্রিয়াধীন", desc: "অর্ডারটি গ্রহণ করা হয়েছে এবং অনুমোদনের অপেক্ষায় রয়েছে।" },
    { key: "Confirmed", label: "অর্ডার নিশ্চিত", desc: "পাইকারি অর্ডারটি গৃহীত হয়েছে এবং ডিপোতে ওষুধ বরাদ্দ করা হয়েছে।" },
    { key: "Processing", label: "ব্যাচ ও মেয়াদ যাচাই", desc: "ওষুধের ব্যাচ নম্বর ও মেয়াদ (FEFO) ডিপোতে যাচাই করা হচ্ছে।" },
    { key: "Packed", label: "প্যাকিং সম্পন্ন", desc: "থার্মাল বক্সে কোল্ড-চেইন প্যাকিং সম্পন্ন, ডিপো ডিসপ্যাচ বে-তে প্রস্তুত।" },
    { key: "Out for Delivery", label: "রাইডার পথে আছেন", desc: "মেডিচেইন ডেলিভারি রাইডার আপনার ফার্মেসির উদ্দেশ্যে রওনা হয়েছেন।" },
    { key: "Delivered", label: "ডেলিভারি সম্পন্ন", desc: "ওষুধ বুঝিয়ে দেওয়া হয়েছে এবং ডিজিটাল চালান ইস্যু করা হয়েছে।" },
    { key: "Completed", label: "সম্পন্ন", desc: "অর্ডারটি সফলভাবে সম্পন্ন হয়েছে।" }
  ];

  // If order is cancelled, we should show that
  if (order.status === "Cancelled") {
    return (
      <div className="w-full h-full bg-brand-bg flex flex-col p-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="p-1.5 rounded-full bg-white border border-slate-100"><ArrowLeft className="w-4 h-4" /></button>
          <h2 className="text-sm font-black">অর্ডার বাতিল হয়েছে</h2>
        </div>
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold text-center">
          এই অর্ডারটি বাতিল করা হয়েছে।
        </div>
      </div>
    );
  }

  // Find index of current status
  const currentStepIdx = steps.findIndex(s => s.key === order.status);

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between select-none overflow-y-auto">
      {/* Scrollable Tracker */}
      <div className="p-4 space-y-4">
        {/* Back button header */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h2 className="text-sm font-black text-brand-charcoal">{userRole === "Pharmacy Owner" ? "লাইভ ডেলিভারি ট্র্যাকিং" : "ডিপো অর্ডার ট্র্যাকিং"}</h2>
            <p className="text-[10px] text-slate-400 font-mono font-bold">{formatRefId(order.id, "ORD")}</p>
          </div>
        </div>

        {/* Order Details Header */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400 block">সর্বমোট বিল</span>
            <span className="text-sm font-black text-brand-purple font-mono">৳{order.totalAmount.toLocaleString()}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">আনুমানিক ডেলিভারি</span>
            <span className="font-bold text-slate-700">{order.estimatedDelivery}</span>
          </div>
        </div>

        {/* 4-Stage Horizontal Progress Tracker (Premium Widget) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3 shadow-3xs">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">ডেলিভারি ট্র্যাকিং অগ্রগতি</span>
          <div className="flex items-center justify-between relative px-2.5 pt-1">
            {/* Background line */}
            <div className="absolute top-[13px] left-4 right-4 h-0.5 bg-slate-100 z-0" />
            {/* Progress filler line */}
            <div 
              className="absolute top-[13px] left-4 h-0.5 bg-brand-purple z-0 transition-all duration-500" 
              style={{
                width: order.status === "Delivered" || order.status === "Completed" ? "calc(100% - 32px)" :
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
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  st.active ? "bg-brand-purple border-brand-purple text-white scale-110" : "bg-white border-slate-200"
                }`}>
                  {st.active && <div className="w-1.5 h-1.5 bg-brand-lime rounded-full" />}
                </div>
                <span className={`text-[8px] font-black mt-1.5 ${st.active ? "text-brand-purple" : "text-slate-400"}`}>
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rider Handover OTP & Secure Actions */}
        {order.status === "Out for Delivery" && (
          <div className="bg-brand-purple/5 border border-brand-purple/15 p-3 rounded-2xl flex items-center justify-between gap-2 animate-fade-in shadow-3xs">
            <div>
              <span className="text-[8px] text-brand-purple font-black uppercase tracking-wider block font-bold">🔒 নিরাপদ ডেলিভারি ওটিপি পিন</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="bg-brand-purple text-white font-mono font-black text-xs px-2 py-0.5 rounded shadow-sm">
                  OTP: {order.handoverOtp || "------"}
                </span>
                <span className="text-[8.5px] text-slate-500 font-semibold leading-tight">ওষুধ বুঝে পাওয়ার পর রাইডারকে দিন</span>
              </div>
            </div>
            <a
              href="tel:+880191234567"
              className="bg-brand-lime text-slate-900 px-3 py-2 rounded-xl text-[9px] font-black flex items-center gap-1 hover:shadow-xs transition-all cursor-pointer flex-shrink-0"
            >
              <Phone className="w-3 h-3" />
              রাইডারকে কল দিন
            </a>
          </div>
        )}

        {/* Vertical Stepper */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-6">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-3">
            <Compass className="w-4 h-4 text-brand-purple animate-spin-slow" />
            অর্ডারের বিস্তারিত ট্র্যাকিং টাইমলাইন
          </h3>

          <div className="relative pl-6 space-y-6">
            {/* Vertical connector line */}
            <div className="absolute left-2.5 top-1.5 bottom-1.5 w-0.5 bg-slate-100" />

            {steps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const isFuture = idx > currentStepIdx;

              return (
                <div key={step.key} className="relative text-xs">
                  {/* Circle indicator */}
                  <div className={`absolute left-[-21px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                    isPast
                      ? "bg-brand-lime border-brand-lime text-slate-900"
                      : isCurrent
                      ? "bg-brand-purple border-brand-purple text-white animate-pulse"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}>
                    {isPast ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="text-[9px] font-bold font-mono">{idx + 1}</span>
                    )}
                  </div>

                  <div>
                    <h4 className={`font-black ${
                      isCurrent ? "text-brand-purple" : isFuture ? "text-slate-400" : "text-slate-800"
                    }`}>
                      {step.label}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {userRole === "Pharmacy Owner" && order.status === "Out for Delivery" && (
        <div className="p-5 bg-brand-bg border-t border-slate-100 rounded-t-3xl shadow-xl flex-shrink-0 mt-4 text-center">
          <h4 className="text-[11px] font-extrabold text-brand-purple uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
            <KeyRound className="w-4 h-4 text-brand-purple" />
            ডেলিভারি হ্যান্ডওভার ওটিপি পিন
          </h4>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            ওষুধের কার্টন ও চালান মিলিয়ে নেওয়ার পর কেবল এই পিনটি মেডিচেইন ডেলিভারি রাইডারকে দিন।
          </p>
          <div className="bg-white px-6 py-3 rounded-xl inline-block border border-brand-purple/20 shadow-sm">
            <span className="text-3xl font-black text-brand-charcoal tracking-widest font-mono">
              {order.handoverOtp || "------"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
