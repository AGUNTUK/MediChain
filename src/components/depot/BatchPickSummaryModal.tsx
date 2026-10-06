import React from "react";
import { Order } from "../../types";
import { 
  CheckCircle2, Clock, Package, Layers, ArrowRight, 
  MapPin, ShoppingCart, User, Check, Scan, ShieldCheck, KeyRound, AlertCircle
} from "lucide-react";
import { BatchPickSummaryData } from "./BatchPickModal";

interface BatchPickSummaryModalProps {
  summary: BatchPickSummaryData | null;
  onClose: () => void;
}

export default function BatchPickSummaryModal({ summary, onClose }: BatchPickSummaryModalProps) {
  if (!summary) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    if (mins === 0) return `${remainingSec} seconds`;
    return `${mins}m ${remainingSec}s`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-white to-slate-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800 text-center relative">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>

          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-mono">
            Run Fulfilled • #{summary.batchId}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#14161B] dark:text-white mt-2">
            Batch Pick Run Complete!
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 max-w-md mx-auto mt-1">
            All items across {summary.orders.length} orders were picked via the optimized linear walk path and staged at the packing station.
          </p>
        </div>

        {/* Metrics Overview Grid */}
        <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/50">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#6B7280] dark:text-slate-500 block tracking-wider">
              Time Taken
            </span>
            <span className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5 block">
              {formatDuration(summary.durationSeconds)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#6B7280] dark:text-slate-500 block tracking-wider">
              Orders Batched
            </span>
            <span className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5 block">
              {summary.orders.length}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#6B7280] dark:text-slate-500 block tracking-wider">
              Unique SKUs
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
              {summary.totalUniqueItems}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[#6B7280] dark:text-slate-500 block tracking-wider">
              Total Units
            </span>
            <span className="text-sm sm:text-base font-black text-[#14161B] dark:text-white font-mono mt-0.5 block">
              {summary.totalUnits}
            </span>
          </div>
        </div>

        {/* Scan Pick Verification Audit Breakdown */}
        <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#6B7280] dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Scan Verification Audit
            </span>
            <span className="text-[10px] font-mono text-[#6B7280] dark:text-slate-400 font-bold">
              Safety Compliance: {summary.totalUniqueItems > 0 ? Math.round(((summary.verifiedByScanCount || 0) / summary.totalUniqueItems) * 100) : 0}% Verified
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30">
              <div className="flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px]">
                <Scan className="w-3 h-3" />
                <span>Barcode Scan</span>
              </div>
              <span className="text-base font-black text-emerald-800 dark:text-emerald-300 font-mono mt-0.5 block">
                {summary.verifiedByScanCount || 0}
              </span>
              <span className="text-[9px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">Exact Match</span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30">
              <div className="flex items-center justify-center gap-1 text-amber-800 dark:text-amber-400 font-extrabold text-[11px]">
                <KeyRound className="w-3 h-3" />
                <span>Supervisor Override</span>
              </div>
              <span className="text-base font-black text-amber-800 dark:text-amber-300 font-mono mt-0.5 block">
                {summary.overrideCount || 0}
              </span>
              <span className="text-[9px] text-amber-700/80 dark:text-amber-400/80 font-medium">PIN Authorized</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
              <div className="flex items-center justify-center gap-1 text-[#6B7280] dark:text-slate-400 font-extrabold text-[11px]">
                <AlertCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span>Unverified</span>
              </div>
              <span className="text-base font-black text-[#14161B] dark:text-slate-300 font-mono mt-0.5 block">
                {summary.unverifiedCount || 0}
              </span>
              <span className="text-[9px] text-[#6B7280] dark:text-slate-500 font-medium">Quick Pick</span>
            </div>
          </div>
        </div>

        {/* Included Orders List */}
        <div className="p-6 space-y-4 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#14161B] dark:text-slate-300 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Included Orders in Run
            </h4>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
              Moved to Processing
            </span>
          </div>

          <div className="space-y-2">
            {summary.orders.map(order => (
              <div 
                key={order.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs dark:bg-slate-950/80 dark:border-slate-800/90"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-purple-600 dark:text-purple-400">
                        #{order.readableId || order.id.substring(0, 8)}
                      </span>
                      <span className="text-[10px] text-[#6B7280] dark:text-slate-500">
                        • {order.items?.length || 0} items
                      </span>
                    </div>
                    <span className="text-[#14161B] dark:text-slate-300 font-semibold text-[11px] block truncate max-w-[240px]">
                      {order.pharmacyName || `Pharmacy ID: ${order.pharmacyId.substring(0, 8)}`}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase font-bold text-[#6B7280] dark:text-slate-500 block">Total</span>
                  <span className="font-mono font-black text-[#14161B] dark:text-slate-200">৳{order.totalAmount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Advice Banner */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-[#6B7280] dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
          <span>
            <strong>Next step:</strong> Orders can now be individually inspected, packed, and printed with thermal packing slips from the Orders screen.
          </span>
        </div>

        {/* Action Button */}
        <div className="p-6 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Done & Return to Orders Queue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
