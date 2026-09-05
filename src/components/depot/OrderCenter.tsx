import React, { useState, useMemo } from "react";
import { Order, OrderItem, Product } from "../../types";
import { 
  CheckCircle2, Clock, Truck, Package, Printer, ChevronRight, Search, 
  MapPin, ShoppingCart, User, MapPinned, FileText, Check, ArrowRight, X, Eye,
  Layers, CheckSquare, Square, AlertCircle, Barcode, Scan, KeyRound, ShieldCheck
} from "lucide-react";
import { getRackLocation, getBarcodeForProduct } from "./depotUtils";
import BatchPickModal, { BatchPickSummaryData } from "./BatchPickModal";
import BatchPickSummaryModal from "./BatchPickSummaryModal";
import BarcodePickScanner, { VerificationStatus, ScanVerificationResult } from "./BarcodePickScanner";
import ChainLinkEmptyState from "./ChainLinkEmptyState";

interface OrderCenterProps {
  orders: Order[];
  products?: Product[];
  currentUser?: any;
  onAccept: (orderId: string) => void;
  onProcess: (orderId: string) => void;
  onPack: (orderId: string) => void;
  onRefresh?: () => void;
  onBatchProcess?: (orderIds: string[], meta?: any) => Promise<void>;
}

export default function OrderCenter({ 
  orders, 
  products = [],
  currentUser,
  onAccept, 
  onProcess, 
  onPack,
  onRefresh,
  onBatchProcess 
}: OrderCenterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "confirmed" | "processing" | "packed">("all");

  // Multi-select for Batch Picking (only for "Confirmed" status orders)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchSummary, setBatchSummary] = useState<BatchPickSummaryData | null>(null);

  // Single Order Scan Verification State
  const [singleVerifications, setSingleVerifications] = useState<Map<string, { status: VerificationStatus; scannedCode: string }>>(new Map());
  const [singlePickedKeys, setSinglePickedKeys] = useState<Set<string>>(new Set());
  const [singleScanningItem, setSingleScanningItem] = useState<{
    key: string;
    productId: string;
    name: string;
    strength?: string;
    packSize?: string;
    shelfLocation?: string;
    barcode?: string;
  } | null>(null);

  const confirmedOrders = useMemo(() => orders.filter(o => o.status === "Confirmed"), [orders]);
  
  const selectedConfirmedOrders = useMemo(() => {
    return orders.filter(o => o.status === "Confirmed" && selectedOrderIds.has(o.id));
  }, [orders, selectedOrderIds]);

  const totalBatchUnitsCount = useMemo(() => {
    return selectedConfirmedOrders.reduce((acc, o) => {
      return acc + (o.items || []).reduce((sum, itm) => sum + itm.quantity, 0);
    }, 0);
  }, [selectedConfirmedOrders]);

  const totalBatchUniqueItems = useMemo(() => {
    const set = new Set<string>();
    selectedConfirmedOrders.forEach(o => {
      (o.items || []).forEach(itm => set.add(itm.productId || itm.name));
    });
    return set.size;
  }, [selectedConfirmedOrders]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleSelectAllConfirmed = () => {
    if (selectedOrderIds.size === confirmedOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(confirmedOrders.map(o => o.id)));
    }
  };

  // Filter orders based on active local tab and search term
  const filteredOrders = orders.filter(order => {
    // Tab filter
    if (activeTab === "pending" && order.status !== "Pending") return false;
    if (activeTab === "confirmed" && order.status !== "Confirmed") return false;
    if (activeTab === "processing" && order.status !== "Processing") return false;
    if (activeTab === "packed" && order.status !== "Packed") return false;

    // Search query
    const searchString = `${order.id} ${order.deliveryAddress || ""} ${order.readableId || ""} ${order.pharmacyName || ""}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Sort picking list items by their Rack/Shelf location to create an optimal warehouse walking path
  const getOptimizedPickingPath = (items: OrderItem[]) => {
    return [...items].sort((a, b) => {
      const locA = getRackLocation(a.productId, a.name, "Tablet");
      const locB = getRackLocation(b.productId, b.name, "Tablet");
      return locA.localeCompare(locB);
    });
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6 relative pb-20">
      
      {/* Search & Tabs Controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        
        {/* Tab filters */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
          {[
            { id: "all", label: "All Orders", count: orders.length },
            { id: "pending", label: "Pending", count: orders.filter(o => o.status === "Pending").length },
            { id: "confirmed", label: "Confirmed", count: confirmedOrders.length },
            { id: "processing", label: "Processing", count: orders.filter(o => o.status === "Processing").length },
            { id: "packed", label: "Packed / Ready", count: orders.filter(o => o.status === "Packed").length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id 
                  ? "bg-purple-600 text-white shadow-sm" 
                  : "text-[#6B7280] dark:text-slate-400 hover:text-[#14161B] dark:hover:text-slate-200"
              }`}
            >
              {tab.label} <span className="ml-1 opacity-70 text-[10px]">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Real-time Search Box & Batch helper */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order ID, pharmacy name, or delivery address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-[#14161B] dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {confirmedOrders.length > 0 && (
            <button
              onClick={handleSelectAllConfirmed}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-[#14161B] dark:text-slate-300 hover:text-purple-700 dark:hover:text-white transition-all cursor-pointer shrink-0 hidden sm:flex items-center gap-1.5"
              title="Select or deselect all confirmed orders for batch picking"
            >
              <CheckSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>
                {selectedOrderIds.size === confirmedOrders.length ? "Deselect All" : `Select All Confirmed (${confirmedOrders.length})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Orders Grid View */}
      {filteredOrders.length === 0 ? (
        <ChainLinkEmptyState 
          icon={ShoppingCart}
          title="No Warehouse Orders Found"
          description={searchTerm ? `No orders matching query "${searchTerm}". Try a different search term or tab filter.` : `No orders currently present in the "${activeTab}" view.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const isProcessing = order.status === "Processing";
            const isConfirmed = order.status === "Confirmed";
            const isSelected = selectedOrderIds.has(order.id);

            return (
              <div 
                key={order.id} 
                className={`bg-white dark:bg-slate-950 rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                  isSelected 
                    ? "border-purple-600 ring-2 ring-purple-500/20 shadow-lg shadow-purple-900/10" 
                    : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isConfirmed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrderSelection(order.id);
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                              : "bg-slate-100 dark:bg-slate-900 text-[#6B7280] dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          }`}
                          title="Select order for Batch Picking"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#6B7280] dark:text-slate-400" />
                          )}
                          <span>{isSelected ? "Selected" : "Select"}</span>
                        </button>
                      )}
                      <span className="font-mono text-xs font-extrabold text-purple-600 dark:text-purple-400">
                        #{order.readableId || order.id.substring(0, 8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {order.isBatchPicked && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 font-mono">
                          Batch Picked
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        order.status === "Pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20" :
                        order.status === "Confirmed" ? "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20" :
                        isProcessing ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20" :
                        order.status === "Packed" ? "bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20" :
                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                      }`}>{order.status}</span>
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#14161B] dark:text-slate-300">
                      <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="font-semibold truncate">
                        {order.pharmacyName || `Pharmacy ID: ${order.pharmacyId.substring(0, 8)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#14161B] dark:text-slate-300">
                      <MapPinned className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate text-[#6B7280] dark:text-slate-400 font-medium">{order.deliveryAddress || "Dhaka Main Depot Delivery"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#14161B] dark:text-slate-300">
                      <ShoppingCart className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-[#6B7280] dark:text-slate-400 font-medium">{order.items?.length || 0} items ordered</span>
                    </div>

                    {order.pickerName && (
                      <div className="flex items-center gap-2 text-[11px] text-[#6B7280] dark:text-slate-400 pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Picked by: <strong className="text-[#14161B] dark:text-slate-200">{order.pickerName}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Peek item summaries */}
                  <div className="mt-3.5 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-900 text-[11px] text-[#6B7280] dark:text-slate-400 space-y-1">
                    {order.items?.slice(0, 2).map((it, idx) => (
                      <div key={idx} className="flex justify-between font-medium">
                        <span className="truncate">{it.name} ({it.strength})</span>
                        <span className="text-[#14161B] dark:text-slate-200 font-bold">x{it.quantity}</span>
                      </div>
                    ))}
                    {(order.items?.length || 0) > 2 && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 text-right font-bold font-mono">+{(order.items?.length || 0) - 2} more medicines</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-900 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-[#6B7280] dark:text-slate-500 block uppercase font-bold tracking-wider">Total Amount</span>
                    <span className="font-black text-[#14161B] dark:text-slate-100 text-sm">৳{order.totalAmount}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-[#14161B] dark:text-slate-300 border border-slate-200 dark:border-slate-800 p-2 rounded-xl transition-all cursor-pointer"
                      title="Open Picking Path / Work details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {order.status === "Pending" && (
                      <button
                        onClick={() => onAccept(order.id)}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                    )}
                    {order.status === "Confirmed" && (
                      <button
                        onClick={() => onProcess(order.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 animate-pulse shadow-sm"
                      >
                        <ArrowRight className="w-3.5 h-3.5 animate-bounce-right" /> Pick Path
                      </button>
                    )}
                    {order.status === "Processing" && (
                      <button
                        onClick={() => onPack(order.id)}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Package className="w-3.5 h-3.5" /> Pack Order
                      </button>
                    )}
                    {order.status === "Packed" && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-500" /> Packed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== BATCH PICKING FLOATING ACTION BAR ==================== */}
      {selectedConfirmedOrders.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-white/95 dark:bg-slate-900/95 border-2 border-purple-600 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-600/30 border border-purple-200 dark:border-purple-400/40 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-[#14161B] dark:text-white flex items-center gap-2">
                <span>Batch Pick Run Ready</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-600 text-white font-black">
                  {selectedConfirmedOrders.length} Orders Combined
                </span>
              </h4>
              <p className="text-[11px] text-[#6B7280] dark:text-purple-200/80 font-medium">
                {totalBatchUniqueItems} unique SKUs • {totalBatchUnitsCount} total medicine units ready for merged walk path
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-3 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:text-[#14161B] dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Combine & Pick ({selectedConfirmedOrders.length} Orders)
            </button>
          </div>
        </div>
      )}

      {/* Floating reminder when only 1 order is selected */}
      {selectedConfirmedOrders.length === 1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-xl text-xs text-[#14161B] dark:text-slate-300 flex items-center gap-2.5 backdrop-blur-sm animate-in fade-in">
          <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>1 Confirmed order selected. Select at least 1 more order to enable <strong>Combine & Pick</strong>.</span>
          <button 
            onClick={() => setSelectedOrderIds(new Set())}
            className="text-purple-600 dark:text-purple-400 hover:underline text-[11px] font-bold ml-1 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* ==================== BATCH PICKING MODAL ==================== */}
      <BatchPickModal
        isOpen={isBatchModalOpen}
        selectedOrders={selectedConfirmedOrders}
        products={products}
        currentUser={currentUser}
        onClose={() => setIsBatchModalOpen(false)}
        onComplete={(summary) => {
          setIsBatchModalOpen(false);
          setBatchSummary(summary);
          setSelectedOrderIds(new Set());
          if (onRefresh) onRefresh();
        }}
        onBatchProcess={onBatchProcess}
      />

      {/* ==================== BATCH PICK SUMMARY MODAL ==================== */}
      <BatchPickSummaryModal
        summary={batchSummary}
        onClose={() => {
          setBatchSummary(null);
          if (onRefresh) onRefresh();
        }}
      />

      {/* ==================== WORKFLOW PICKING PATH MODAL ==================== */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#14161B] dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Order Picking Details
                </h3>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-mono mt-0.5">Order ID: {selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              
              {/* Workflow stepper buttons & verification indicator */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-500 uppercase block font-bold tracking-wider">Current status</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-[#14161B] dark:text-slate-200">{selectedOrder.status}</span>
                    {selectedOrder.status === "Confirmed" && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                        {singlePickedKeys.size} / {(selectedOrder.items || []).length} Verified
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Workflow stepper buttons */}
                <div className="flex gap-2 flex-wrap">
                  {selectedOrder.status === "Pending" && (
                    <button
                      onClick={() => { onAccept(selectedOrder.id); setSelectedOrder(null); }}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3.5 rounded-xl cursor-pointer"
                    >
                      Accept Order
                    </button>
                  )}
                  {selectedOrder.status === "Confirmed" && (
                    <button
                      onClick={() => { 
                        onProcess(selectedOrder.id); 
                        setSelectedOrder(null); 
                      }}
                      className={`font-bold py-1.5 px-3.5 rounded-xl cursor-pointer flex items-center gap-1.5 ${
                        singlePickedKeys.size === (selectedOrder.items || []).length && (selectedOrder.items || []).length > 0
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {singlePickedKeys.size === (selectedOrder.items || []).length && (selectedOrder.items || []).length > 0 ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete Picking (All Scanned)</span>
                        </>
                      ) : (
                        <span>Start / Finish Picking</span>
                      )}
                    </button>
                  )}
                  {selectedOrder.status === "Processing" && (
                    <button
                      onClick={() => { onPack(selectedOrder.id); setSelectedOrder(null); }}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 px-3.5 rounded-xl cursor-pointer"
                    >
                      Mark Packed
                    </button>
                  )}
                  <button
                    onClick={() => setIsPrintPreviewOpen(true)}
                    className="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 text-[#14161B] dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold py-1.5 px-3 rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Packing Slip
                  </button>
                </div>
              </div>

              {/* Picking Walkpath list sorted by Rack */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Pickpath Optimized (Linear Walk & Barcode Verification)
                  </p>
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-500 font-medium">Sorted by Sector & Shelf</span>
                </div>

                <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-900 overflow-hidden">
                  {getOptimizedPickingPath(selectedOrder.items || []).map((item, idx) => {
                    const shelf = getRackLocation(item.productId, item.name, "Tablet");
                    const itemKey = `${item.productId}_${item.name}`;
                    const isPicked = singlePickedKeys.has(itemKey);
                    const verification = singleVerifications.get(itemKey);
                    const matchingProduct = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase());
                    const { barcode: expectedBarcode, isRegistered } = getBarcodeForProduct(item.productId, matchingProduct?.barcode || (item as any).barcode);

                    return (
                      <div key={idx} className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isPicked ? "bg-emerald-50/70 dark:bg-emerald-950/15" : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            isPicked ? "bg-emerald-500 text-white" : "bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400"
                          }`}>
                            {isPicked ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-extrabold ${isPicked ? "text-[#6B7280] dark:text-slate-400 line-through decoration-emerald-500/50" : "text-[#14161B] dark:text-slate-200"}`}>
                                {item.name}
                              </span>
                              <span className="text-[#6B7280] dark:text-slate-400 text-xs">({item.strength}) • Pack: {item.packSize}</span>
                              
                              {isPicked && verification && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                                  verification.status === "scanned"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                                    : verification.status === "override"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                }`}>
                                  {verification.status === "scanned" && <Scan className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                                  {verification.status === "override" && <KeyRound className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                                  {verification.status === "scanned" ? "Scan Verified" : verification.status === "override" ? "Override PIN" : "Unverified"}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px]">
                              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-md">
                                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                {shelf}
                              </span>
                              
                              <span className="font-mono font-bold text-[#14161B] dark:text-amber-300/90 flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md">
                                <Barcode className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                {expectedBarcode}
                              </span>

                              {!isRegistered && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                  Needs DB Backfill
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-100 dark:border-slate-900 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-[#6B7280] dark:text-slate-500 block uppercase font-bold tracking-wider">Picking Qty</span>
                            <span className="font-black text-[#14161B] dark:text-slate-100 text-sm">x{item.quantity}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSingleScanningItem({
                                  key: itemKey,
                                  productId: item.productId,
                                  name: item.name,
                                  strength: item.strength,
                                  packSize: item.packSize,
                                  shelfLocation: shelf,
                                  barcode: matchingProduct?.barcode || (item as any).barcode
                                });
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isPicked
                                  ? "bg-slate-100 text-[#14161B] dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                                  : "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
                              }`}
                            >
                              <Scan className="w-3.5 h-3.5" />
                              <span>{isPicked ? "Re-Scan" : "Scan"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSinglePickedKeys(prev => {
                                  const next = new Set(prev);
                                  if (next.has(itemKey)) {
                                    next.delete(itemKey);
                                  } else {
                                    next.add(itemKey);
                                  }
                                  return next;
                                });
                              }}
                              className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isPicked
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                                  : "bg-slate-100 text-slate-400 hover:text-[#14161B] dark:bg-slate-900 dark:text-slate-500 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-800"
                              }`}
                              title={isPicked ? "Unmark picked" : "Quick pick"}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Single Order Live Barcode Scanner Modal */}
              {singleScanningItem && (
                <BarcodePickScanner
                  isOpen={true}
                  product={{
                    id: singleScanningItem.productId,
                    name: singleScanningItem.name,
                    strength: singleScanningItem.strength,
                    packSize: singleScanningItem.packSize,
                    shelfLocation: singleScanningItem.shelfLocation,
                    barcode: singleScanningItem.barcode
                  }}
                  onClose={() => setSingleScanningItem(null)}
                  onVerified={(result) => {
                    const key = singleScanningItem.key;
                    setSinglePickedKeys(prev => new Set(prev).add(key));
                    setSingleVerifications(prev => new Map(prev).set(key, { status: result.status, scannedCode: result.scannedCode }));
                    setSingleScanningItem(null);
                  }}
                />
              )}

            </div>
          </div>
        </div>
      )}

      {/* ==================== THERMAL PACKING SLIP PRINT PREVIEW MODAL ==================== */}
      {isPrintPreviewOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#14161B] dark:text-slate-100 flex items-center gap-1.5">
                <Printer className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                Thermal Printer Preview
              </h3>
              <button 
                onClick={() => setIsPrintPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Print Slip layout (styled like 80mm paper roll) */}
            <div className="bg-white text-black font-mono p-5 text-xs border-2 border-slate-200 max-h-[60vh] overflow-y-auto shadow-inner rounded-md mx-auto" style={{ width: "320px" }}>
              <div className="text-center space-y-1">
                <h1 className="font-black text-sm tracking-widest">MEDICHAIN DEPOT</h1>
                <p className="text-[9px] uppercase font-bold">Warehouse Management Slip</p>
                <p className="text-[9px] text-slate-600">Dhaka Main Warehouse-01</p>
                <p className="text-[9px] text-slate-500 font-bold">--------------------------------</p>
              </div>

              <div className="mt-3.5 space-y-1.5 text-[10px]">
                <div><span className="font-bold">SLIP ID:</span> PK-{selectedOrder.id.substring(0, 8).toUpperCase()}</div>
                <div><span className="font-bold">DATE:</span> {new Date().toLocaleDateString()}</div>
                <div><span className="font-bold">DELIVER TO:</span> Pharmacy ID {selectedOrder.pharmacyId.substring(0, 8)}</div>
                <div><span className="font-bold">ADDRESS:</span> {selectedOrder.deliveryAddress || "Standard Route"}</div>
                <div><span className="font-bold">STATUS:</span> {selectedOrder.status.toUpperCase()}</div>
              </div>

              <p className="text-[9px] text-slate-500 mt-2 font-bold">--------------------------------</p>
              <p className="text-[9px] font-bold uppercase text-center my-1">PICKING & PACKING ORDER</p>
              <p className="text-[9px] text-slate-500 font-bold">--------------------------------</p>

              {/* Items grouped in sorted sequence */}
              <div className="space-y-2 mt-2 text-[10px]">
                {getOptimizedPickingPath(selectedOrder.items || []).map((item, idx) => {
                  const location = getRackLocation(item.productId, item.name, "Tablet");
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span className="truncate">{idx + 1}. {item.name}</span>
                        <span>x{item.quantity}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-600">
                        <span>Shelf: {location}</span>
                        <span>{item.strength}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[9px] text-slate-500 mt-3.5 font-bold">--------------------------------</p>
              
              <div className="space-y-1 mt-2 text-[10px] font-bold">
                <div className="flex justify-between">
                  <span>TOTAL ITEMS:</span>
                  <span>{selectedOrder.items?.length || 0} items</span>
                </div>
                <div className="flex justify-between text-xs font-black border-t border-dashed border-black pt-1">
                  <span>TOTAL VAL:</span>
                  <span>৳{selectedOrder.totalAmount}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-dashed border-slate-400 flex flex-col items-center justify-center space-y-1 text-center">
                <div className="w-20 h-20 bg-slate-100 flex items-center justify-center border border-slate-300 text-[10px] text-slate-500 font-bold">
                  [ QR CODE ]
                </div>
                <span className="text-[8px] uppercase tracking-wider text-slate-600 font-bold">Scan to Verify Dispatch</span>
              </div>

              <div className="mt-6 flex justify-between text-[9px] font-bold">
                <div className="border-t border-black pt-1 w-20 text-center">Picker Sign</div>
                <div className="border-t border-black pt-1 w-20 text-center">Rider Sign</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsPrintPreviewOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-[#14161B] dark:text-slate-400 font-bold py-2 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintSlip}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Trigger Thermal Print
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
