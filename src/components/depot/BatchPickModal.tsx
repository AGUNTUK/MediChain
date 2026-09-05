import React, { useState, useEffect, useMemo } from "react";
import { Order, Product } from "../../types";
import { 
  Layers, CheckCircle2, Clock, MapPin, X, ArrowRight, Check, 
  AlertCircle, ShoppingBag, Package, Timer, CheckSquare, Square,
  Barcode, Scan, ShieldAlert, KeyRound
} from "lucide-react";
import { getRackLocation, getBarcodeForProduct } from "./depotUtils";
import BarcodePickScanner, { VerificationStatus, ScanVerificationResult } from "./BarcodePickScanner";

export interface MergedPickItem {
  key: string;
  productId: string;
  name: string;
  genericName?: string;
  strength: string;
  packSize: string;
  shelfLocation: string;
  totalQuantity: number;
  barcode?: string;
  orderAllocations: {
    orderId: string;
    readableId: string;
    pharmacyName?: string;
    quantity: number;
  }[];
}

export interface BatchPickSummaryData {
  batchId: string;
  orders: Order[];
  totalUniqueItems: number;
  totalUnits: number;
  durationSeconds: number;
  pickerName: string;
  completedAt: string;
  verifiedByScanCount: number;
  overrideCount: number;
  unverifiedCount: number;
}

interface BatchPickModalProps {
  isOpen: boolean;
  selectedOrders: Order[];
  products?: Product[];
  currentUser?: any;
  onClose: () => void;
  onComplete: (summary: BatchPickSummaryData) => void;
  onBatchProcess?: (orderIds: string[], meta?: any) => Promise<void>;
}

export default function BatchPickModal({
  isOpen,
  selectedOrders,
  products = [],
  currentUser,
  onClose,
  onComplete,
  onBatchProcess
}: BatchPickModalProps) {
  const [batchId] = useState(() => `BATCH-${Date.now().toString(36).substring(3, 8).toUpperCase()}`);
  const [startTime] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pickedKeys, setPickedKeys] = useState<Set<string>>(new Set());
  const [verifications, setVerifications] = useState<Map<string, { status: VerificationStatus; scannedCode: string }>>(new Map());
  const [activeScanningItem, setActiveScanningItem] = useState<MergedPickItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live timer interval
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, startTime]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSec.toString().padStart(2, "0")}`;
  };

  // Generate MERGED pick list across all selected orders
  const mergedPickList: MergedPickItem[] = useMemo(() => {
    if (!selectedOrders || selectedOrders.length === 0) return [];
    const map = new Map<string, MergedPickItem>();

    // Index products by id to resolve barcodes
    const productBarcodeMap = new Map<string, string>();
    products.forEach(p => {
      if (p.barcode) productBarcodeMap.set(p.id, p.barcode);
    });

    for (const order of selectedOrders) {
      const readableId = order.readableId || `MCH-${order.id.substring(0, 5).toUpperCase()}`;
      for (const item of order.items || []) {
        const key = `${item.productId}_${item.name}_${item.strength}`;
        const shelf = getRackLocation(item.productId, item.name, "Tablet");
        const barcode = productBarcodeMap.get(item.productId) || (item as any).barcode;

        if (!map.has(key)) {
          map.set(key, {
            key,
            productId: item.productId,
            name: item.name,
            genericName: item.genericName,
            strength: item.strength,
            packSize: item.packSize,
            shelfLocation: shelf,
            totalQuantity: item.quantity,
            barcode,
            orderAllocations: [
              {
                orderId: order.id,
                readableId,
                pharmacyName: order.pharmacyName,
                quantity: item.quantity
              }
            ]
          });
        } else {
          const existing = map.get(key)!;
          existing.totalQuantity += item.quantity;
          existing.orderAllocations.push({
            orderId: order.id,
            readableId,
            pharmacyName: order.pharmacyName,
            quantity: item.quantity
          });
        }
      }
    }

    // Sort by linear walk pickpath optimization (sector & shelf location)
    return Array.from(map.values()).sort((a, b) => a.shelfLocation.localeCompare(b.shelfLocation));
  }, [selectedOrders, products]);

  const totalUnits = useMemo(() => {
    return mergedPickList.reduce((acc, item) => acc + item.totalQuantity, 0);
  }, [mergedPickList]);

  const pickedUnits = useMemo(() => {
    return mergedPickList
      .filter(item => pickedKeys.has(item.key))
      .reduce((acc, item) => acc + item.totalQuantity, 0);
  }, [mergedPickList, pickedKeys]);

  const progressPercent = mergedPickList.length > 0
    ? Math.round((pickedKeys.size / mergedPickList.length) * 100)
    : 0;

  const togglePicked = (key: string, explicitStatus: VerificationStatus = "unverified") => {
    setPickedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setVerifications(vPrev => {
          const vNext = new Map(vPrev);
          vNext.delete(key);
          return vNext;
        });
      } else {
        next.add(key);
        setVerifications(vPrev => {
          const vNext = new Map(vPrev);
          vNext.set(key, { status: explicitStatus, scannedCode: "MANUAL-TOGGLE" });
          return vNext;
        });
      }
      return next;
    });
  };

  const handleItemVerified = (result: ScanVerificationResult) => {
    if (!activeScanningItem) return;
    const key = activeScanningItem.key;
    setPickedKeys(prev => new Set(prev).add(key));
    setVerifications(prev => new Map(prev).set(key, { status: result.status, scannedCode: result.scannedCode }));
    setActiveScanningItem(null);
  };

  const handleCompleteRun = async () => {
    if (selectedOrders.length === 0) return;
    setIsSubmitting(true);
    try {
      const completedAt = new Date().toISOString();
      const startedAt = new Date(startTime).toISOString();
      const orderIds = selectedOrders.map(o => o.id);

      let verifiedByScanCount = 0;
      let overrideCount = 0;
      let unverifiedCount = 0;

      pickedKeys.forEach(key => {
        const ver = verifications.get(key);
        if (ver?.status === "scanned") verifiedByScanCount++;
        else if (ver?.status === "override") overrideCount++;
        else unverifiedCount++;
      });

      const payload = {
        orderIds,
        pickerId: currentUser?.id || "depot-staff-01",
        pickerName: currentUser?.name || "Arif Hossain (Depot Picker)",
        pickStartedAt: startedAt,
        pickCompletedAt: completedAt,
        batchId,
        unverifiedPicksCount: unverifiedCount + overrideCount
      };

      if (onBatchProcess) {
        await onBatchProcess(orderIds, payload);
      } else {
        const res = await fetch("/api/depot/orders/batch-process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          throw new Error("Failed to update orders to Processing in batch");
        }
      }

      onComplete({
        batchId,
        orders: selectedOrders,
        totalUniqueItems: mergedPickList.length,
        totalUnits,
        durationSeconds: elapsedSeconds,
        pickerName: currentUser?.name || "Arif Hossain (Depot Picker)",
        completedAt,
        verifiedByScanCount,
        overrideCount,
        unverifiedCount
      });
    } catch (err: any) {
      console.error("Batch completion failed:", err);
      alert("Error completing batch pick run: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/40 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/20">
                  Batch Pick Run
                </span>
                <span className="text-xs font-mono font-black text-[#14161B] dark:text-slate-300">
                  #{batchId}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#14161B] dark:text-white mt-0.5">
                Merged Linear Pickpath • {selectedOrders.length} Orders Combined
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Timer */}
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-slate-900/90 border border-amber-200 dark:border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-amber-800 dark:text-amber-300 shadow-inner">
              <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span>{formatElapsed(elapsedSeconds)}</span>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#6B7280] hover:text-[#14161B] dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress & Route Banner */}
        <div className="px-5 py-3.5 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-extrabold text-[#14161B] dark:text-slate-200">
              Pickpath Walk Optimized:
            </span>
            <span className="text-[#6B7280] dark:text-slate-400">
              Linear sequence sorted by Sector & Rack
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-[#6B7280] dark:text-slate-400">Progress:</span>
              <span className="text-[#14161B] dark:text-white font-mono">{pickedKeys.size} / {mergedPickList.length} SKUs</span>
              <span className="text-slate-400 dark:text-slate-500">({pickedUnits}/{totalUnits} units)</span>
            </div>
            <div className="w-24 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">{progressPercent}%</span>
          </div>
        </div>

        {/* Merged Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {mergedPickList.map((item, idx) => {
            const isPicked = pickedKeys.has(item.key);
            const verification = verifications.get(item.key);
            const { barcode: expectedBarcode, isRegistered } = getBarcodeForProduct(item.productId, item.barcode);

            return (
              <div 
                key={item.key}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isPicked 
                    ? "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/15 dark:border-emerald-500/40 shadow-sm"
                    : "bg-white dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/90 hover:border-purple-300 dark:hover:border-slate-700 shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Sequence step index */}
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 transition-all ${
                    isPicked
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[#14161B] dark:text-slate-300"
                  }`}>
                    {isPicked ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-extrabold transition-all ${
                        isPicked ? "text-[#6B7280] dark:text-slate-300 line-through decoration-emerald-500/50" : "text-[#14161B] dark:text-white"
                      }`}>
                        {item.name}
                      </h4>
                      <span className="text-xs text-[#6B7280] dark:text-slate-400 font-medium">({item.strength})</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                        {item.packSize}
                      </span>

                      {/* Verification status pill */}
                      {isPicked && verification && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                          verification.status === "scanned"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                            : verification.status === "override"
                            ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                            : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                        }`}>
                          {verification.status === "scanned" && <Scan className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                          {verification.status === "override" && <KeyRound className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                          {verification.status === "scanned" ? "Scan Verified" : verification.status === "override" ? "Override PIN" : "Unverified"}
                        </span>
                      )}
                    </div>

                    {item.genericName && (
                      <p className="text-[11px] text-[#6B7280] dark:text-slate-500 italic mt-0.5">
                        {item.genericName}
                      </p>
                    )}

                    {/* Location Badge and Barcode Identifier */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {item.shelfLocation}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 font-mono font-bold text-amber-800 dark:text-amber-300/90 text-xs flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        {expectedBarcode}
                      </span>

                      {!isRegistered && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" title="Product has no DB barcode. Fallback generated.">
                          ⚠️ Needs DB Backfill
                        </span>
                      )}
                    </div>

                    {/* Order Allocations Breakdown */}
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-[#6B7280] dark:text-slate-500 font-bold uppercase mr-1">
                        Allocates to:
                      </span>
                      {item.orderAllocations.map(alloc => (
                        <span 
                          key={alloc.orderId}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                            isPicked 
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                              : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                          }`}
                        >
                          {isPicked && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                          #{alloc.readableId}: {alloc.quantity} units {isPicked ? "(Fulfilled)" : "(Pending)"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side: total quantity & picking actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-900 pt-3 sm:pt-0 gap-2">
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#6B7280] dark:text-slate-500 block">
                      Total Needed
                    </span>
                    <span className="text-base sm:text-lg font-black text-[#14161B] dark:text-slate-100 font-mono">
                      x{item.totalQuantity} <span className="text-xs text-[#6B7280] dark:text-slate-400 font-normal">units</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Scan & Verify Button */}
                    <button
                      type="button"
                      onClick={() => setActiveScanningItem(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isPicked
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
                          : "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
                      }`}
                    >
                      <Scan className="w-3.5 h-3.5" />
                      <span>{isPicked ? "Re-Scan" : "Scan & Pick"}</span>
                    </button>

                    {/* Quick check toggle */}
                    <button
                      type="button"
                      onClick={() => togglePicked(item.key, "unverified")}
                      className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isPicked
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 dark:hover:bg-emerald-500/30"
                          : "bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:hover:text-slate-300 dark:border-slate-800"
                      }`}
                      title={isPicked ? "Unmark picked" : "Quick pick (unverified)"}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#6B7280] dark:text-slate-400 text-center sm:text-left">
            <span className="font-bold text-[#14161B] dark:text-white">{pickedKeys.size}</span> of{" "}
            <span className="font-bold text-[#14161B] dark:text-white">{mergedPickList.length}</span> SKUs picked •{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{pickedUnits}</span> of{" "}
            <span className="font-bold text-[#14161B] dark:text-white">{totalUnits}</span> units allocated
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#14161B] dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
            >
              Cancel Run
            </button>

            <button
              onClick={handleCompleteRun}
              disabled={isSubmitting || pickedKeys.size === 0}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                pickedKeys.size === mergedPickList.length
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 animate-pulse"
                  : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20"
              }`}
            >
              {isSubmitting ? (
                <span>Fulfilling Orders...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Pick Run ({pickedKeys.size}/{mergedPickList.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Barcode / QR Scanner Modal */}
        {activeScanningItem && (
          <BarcodePickScanner
            isOpen={true}
            product={{
              id: activeScanningItem.productId,
              name: activeScanningItem.name,
              strength: activeScanningItem.strength,
              packSize: activeScanningItem.packSize,
              shelfLocation: activeScanningItem.shelfLocation,
              barcode: activeScanningItem.barcode
            }}
            onClose={() => setActiveScanningItem(null)}
            onVerified={handleItemVerified}
          />
        )}

      </div>
    </div>
  );
}
