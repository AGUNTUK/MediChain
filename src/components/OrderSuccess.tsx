import React from "react";
import { CheckCircle2, ChevronRight, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import MediChainLogo from "./MediChainLogo";

interface OrderSuccessProps {
  orderId: string;
  onTrackOrder: (orderId: string) => void;
  onContinueShopping: () => void;
}

export default function OrderSuccess({ orderId, onTrackOrder, onContinueShopping }: OrderSuccessProps) {
  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between p-6 select-none text-center">
      <div />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="space-y-4 py-8"
      >
        {/* Logo */}
        <div className="flex justify-center">
          <MediChainLogo size="sm" withText={true} textColor="dark" />
        </div>

        {/* Animated Check badge */}
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-brand-lime drop-shadow-md animate-bounce" />
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-brand-charcoal tracking-tight">
            অর্ডার সফলভাবে সম্পন্ন হয়েছে!
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
            আপনার পাইকারি ওষুধ কেন্দ্রীয় ডিপোতে বরাদ্দ করা হয়েছে এবং দ্রুত পাঠানো হবে।
          </p>
        </div>

        {/* Order ID box */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 max-w-[260px] mx-auto space-y-2 shadow-sm text-xs">
          <div className="flex justify-between text-slate-400 font-medium">
            <span>অর্ডার নম্বর:</span>
            <span className="font-mono font-black text-brand-purple">{orderId}</span>
          </div>
          <div className="flex justify-between text-slate-400 font-medium">
            <span>আনুমানিক ডেলিভারি:</span>
            <span className="font-bold text-slate-700">আগামীকাল দুপুর ২:০০ টার মধ্যে</span>
          </div>
          <div className="flex justify-between text-slate-400 font-medium">
            <span>বর্তমান অবস্থা:</span>
            <span className="font-extrabold text-brand-lime">গৃহীত</span>
          </div>
        </div>
      </motion.div>

      {/* Primary Actions */}
      <div className="space-y-2.5">
        <button
          onClick={() => onTrackOrder(orderId)}
          className="w-full bg-brand-purple hover:bg-brand-purple-dark text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20 transition-all cursor-pointer"
        >
          লাইভ ডেলিভারি ট্র্যাকিং দেখুন
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onContinueShopping}
          className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          আরও ওষুধ ক্রয় করুন
        </button>
      </div>
    </div>
  );
}
