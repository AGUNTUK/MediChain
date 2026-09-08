import React, { useRef, useState, useEffect } from "react";
import { Order, Pharmacy, OrderItem } from "../types";
import { 
  Printer, 
  Download, 
  X, 
  Maximize2,
  ZoomIn,
  ZoomOut
} from "lucide-react";

interface ModernInvoiceModalProps {
  order: Order;
  pharmacy?: Pharmacy | null;
  onClose: () => void;
}

/**
 * Intelligent helper to resolve item dosage/category type matching pharmaceutical distribution invoices
 */
export function resolveItemType(item: Partial<OrderItem>): string {
  const cat = (item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const pack = (item.packSize || "").toLowerCase();
  
  if (cat.includes("tablet") || name.includes("tablet") || name.includes("tab ") || name.includes("tab.") || pack.includes("tab")) return "Tablet";
  if (cat.includes("syrup") || cat.includes("suspension") || name.includes("syrup") || name.includes("suspension") || name.includes("syp") || name.includes("liquid") || pack.includes("bottle") || pack.includes("100ml") || pack.includes("200ml") || pack.includes("60ml")) return "Syrup";
  if (cat.includes("capsule") || name.includes("capsule") || name.includes("cap ") || name.includes("cap.") || pack.includes("cap")) return "Capsule";
  if (cat.includes("injection") || name.includes("injection") || name.includes("inj") || name.includes("infusion") || name.includes("iv") || pack.includes("vial") || pack.includes("ampoule")) return "Injection";
  if (cat.includes("drop") || name.includes("drop") || name.includes("eye drop") || name.includes("ear drop")) return "Drop";
  if (cat.includes("ointment") || cat.includes("cream") || cat.includes("gel") || name.includes("ointment") || name.includes("cream") || name.includes("gel") || pack.includes("tube")) return "Ointment";
  if (cat.includes("inhaler") || cat.includes("spray") || name.includes("inhaler") || name.includes("spray") || name.includes("respule")) return "Inhaler";
  if (cat.includes("powder") || cat.includes("sachet") || name.includes("powder") || name.includes("sachet")) return "Powder";
  if (cat.includes("suppository") || name.includes("suppository")) return "Suppository";
  
  if (item.category && item.category.trim()) {
    return item.category.charAt(0).toUpperCase() + item.category.slice(1);
  }
  return "Tablet";
}

export default function ModernInvoiceModal({ order, pharmacy, onClose }: ModernInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const BASE_INVOICE_WIDTH = 800;
  const [zoomMode, setZoomMode] = useState<"fit" | "100%" | "custom">("fit");
  const [customZoom, setCustomZoom] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [invoiceHeight, setInvoiceHeight] = useState<number>(1050);

  useEffect(() => {
    const updateDimensions = () => {
      if (!canvasContainerRef.current) return;
      const containerWidth = canvasContainerRef.current.clientWidth;
      if (invoiceRef.current) {
        setInvoiceHeight(invoiceRef.current.scrollHeight || invoiceRef.current.offsetHeight || 1050);
      }
      if (zoomMode === "fit") {
        const availableWidth = Math.max(280, containerWidth - 16);
        const fitScale = Math.min(1, availableWidth / BASE_INVOICE_WIDTH);
        setScale(fitScale);
      } else if (zoomMode === "100%") {
        setScale(1);
      } else {
        setScale(customZoom);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (canvasContainerRef.current) {
      resizeObserver.observe(canvasContainerRef.current);
    }
    if (invoiceRef.current) {
      resizeObserver.observe(invoiceRef.current);
    }

    window.addEventListener("resize", updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [zoomMode, customZoom]);

  const handleZoomIn = () => {
    setZoomMode("custom");
    setCustomZoom((prev) => Math.min(1.5, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoomMode("custom");
    setCustomZoom((prev) => Math.max(0.35, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleFitScreen = () => {
    setZoomMode("fit");
  };

  const handleActualSize = () => {
    setZoomMode("100%");
  };

  // Format date helper matching sample e.g. 23-AUG-2026
  const formatInvoiceDate = (dateStr?: string) => {
    if (!dateStr) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, "0")}-${now.toLocaleString("en-US", { month: "short" }).toUpperCase()}-${now.getFullYear()}`;
    }
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, "0")}-${d.toLocaleString("en-US", { month: "short" }).toUpperCase()}-${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Format print time stamp
  const formatPrintTimestamp = () => {
    const now = new Date();
    const datePart = `${String(now.getDate()).padStart(2, "0")}-${now.toLocaleString("en-US", { month: "short" }).toUpperCase()}-${now.getFullYear()}`;
    const timePart = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${datePart} ${timePart}`;
  };

  const invoiceDate = formatInvoiceDate(order.createdAt);
  const printedTimestamp = formatPrintTimestamp();

  // Invoice Number formatting
  const cleanId = order.id.replace(/-/g, "").substring(0, 6).toUpperCase();
  const readableNum = order.readableId ? order.readableId.replace("MCH-", "").replace("INV-", "") : cleanId;
  const invoiceNumber = `${readableNum}`;

  // Customer / Pharmacy details with fallback
  const pharmacyName = order.pharmacyName || pharmacy?.pharmacyName || "Tafi Pharmacy";
  const pharmacyPhone = order.pharmacyPhone || pharmacy?.phone || "01924243556";
  const pharmacyAddress = order.pharmacyAddress || order.deliveryAddress || pharmacy?.address || "Madhar More, Nilphamari";
  const pharmacyZone = pharmacy?.upazila || pharmacy?.thana || pharmacy?.district || pharmacy?.city || "Nilphamari";

  // Officer / Sales Rep details
  const officerName = order.salesRep || "MD Parvez Ahmed (Rupom)";
  const officerZone = pharmacyZone;
  const officerContact = "01940681989";

  // Items and pricing calculations
  const items = order.items || [];
  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

  // Delivery charge
  const deliveryCharge = order.deliveryCharge !== undefined ? order.deliveryCharge : 0;

  // Process item values for exact columns
  let totalMrpSum = 0;
  let subTotalRateSum = 0;
  let totalNetDiscountSum = 0;

  const processedItems = items.map((item, index) => {
    const type = resolveItemType(item);
    const qty = item.quantity || 1;
    const rate = item.sellingPrice || (item.subtotal ? item.subtotal / qty : 0);
    const mrp = item.mrp && item.mrp >= rate ? item.mrp : Math.round((rate * 1.22) * 100) / 100;
    
    // Net Discount = (MRP - Rate) * Qty
    const unitDiscount = Math.max(0, mrp - rate);
    const netDiscount = Math.round(unitDiscount * qty * 100) / 100;
    const itemTotal = Math.round(rate * qty * 100) / 100;

    totalMrpSum += mrp * qty;
    subTotalRateSum += itemTotal;
    totalNetDiscountSum += netDiscount;

    // Format display item name with pack size / strength if helpful
    let displayName = item.name;
    if (item.packSize && !displayName.toLowerCase().includes(item.packSize.toLowerCase())) {
      displayName = `${displayName} (${item.packSize})`;
    }

    return {
      sl: index + 1,
      type,
      name: displayName,
      mrp,
      rate,
      qty,
      netDiscount,
      total: itemTotal
    };
  });

  // Calculate final totals
  const subTotal = subTotalRateSum > 0 ? subTotalRateSum : (order.totalAmount || 0);
  const extraDiscount = 0.00;
  const roundAdjustment = 0.00;
  const grandTotal = subTotal + deliveryCharge - extraDiscount + roundAdjustment;
  const paymentPaid = order.paymentStatus === "Paid" ? grandTotal : 0.00;
  const dueAmount = grandTotal - paymentPaid;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const downloadUrl = `/api/orders/${order.id}/invoice`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `Invoice-${order.readableId || order.id.substring(0, 8)}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      id="invoice-modal-overlay" 
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-start justify-center p-1 sm:p-4 md:p-6 animate-fade-in"
    >
      <div 
        id="invoice-modal-dialog" 
        className="w-full max-w-5xl my-1 sm:my-6 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* ==================== ACTION & TOOLBAR (HIDDEN IN PRINT) ==================== */}
        <div className="no-print bg-slate-900 text-white px-3 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-sm shrink-0">
              ৳
            </div>
            <div>
              <div className="text-xs font-black tracking-wide flex items-center gap-1.5 sm:gap-2">
                <span className="truncate max-w-[140px] sm:max-w-none">সেলস চালান / SALES INVOICE</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[10px]">
                  #{invoiceNumber}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                অফিসিয়াল ফার্মেসি ডিস্ট্রিবিউশন ইনভয়েস
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-auto">
            {/* Zoom / View Mode Controls */}
            <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700/80 text-[11px]">
              <button
                onClick={handleFitScreen}
                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  zoomMode === "fit" 
                    ? "bg-purple-600 text-white shadow-xs" 
                    : "text-slate-400 hover:text-white"
                }`}
                title="ফিট স্ক্রিন (Fit to Screen)"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="text-[10px] sm:text-xs">ফিট</span>
              </button>

              <button
                onClick={handleActualSize}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  zoomMode === "100%" 
                    ? "bg-purple-600 text-white shadow-xs" 
                    : "text-slate-400 hover:text-white"
                }`}
                title="১০০% সাইজ (100% Size)"
              >
                <span className="text-[10px] sm:text-xs">১০০%</span>
              </button>

              <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.35}
                className="p-1 hover:text-white text-slate-400 disabled:opacity-40 cursor-pointer transition-colors"
                title="জুম আউট"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-[9px] text-slate-300 px-1 font-bold">
                {Math.round(scale * 100)}%
              </span>

              <button
                onClick={handleZoomIn}
                disabled={scale >= 1.5}
                className="p-1 hover:text-white text-slate-400 disabled:opacity-40 cursor-pointer transition-colors"
                title="জুম ইন"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-1.5 px-3 sm:px-3.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
              title="প্রিন্ট করুন (Print Invoice)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="font-bold">প্রিন্ট (Print)</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-1.5 px-2.5 sm:px-3 rounded-xl flex items-center gap-1 transition-all border border-slate-700 cursor-pointer active:scale-95"
              title="পিডিএফ ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer ml-0.5"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ==================== INVOICE DOCUMENT CANVAS ==================== */}
        <div 
          ref={canvasContainerRef}
          className="p-2 sm:p-5 md:p-6 bg-slate-200/80 overflow-auto flex justify-center items-start min-h-[480px]"
        >
          {/* Scaled Responsive Document Wrapper */}
          <div
            id="medichain-printable-invoice-wrapper"
            style={{
              width: `${BASE_INVOICE_WIDTH * scale}px`,
              height: invoiceHeight ? `${invoiceHeight * scale}px` : "auto",
              position: "relative",
              flexShrink: 0,
              transition: "width 0.15s ease-out, height 0.15s ease-out"
            }}
          >
            <div
              ref={invoiceRef}
              id="medichain-printable-invoice"
              className="bg-white text-slate-900 shadow-xl rounded-none p-6 sm:p-7 font-sans border border-slate-300 text-[11px]"
              style={{
                width: `${BASE_INVOICE_WIDTH}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              }}
            >
              {/* TOP SUB-HEADER: Sales Invoice category */}
              <div className="text-[13px] font-bold text-slate-800 mb-2">
                Sales Invoice
              </div>

              {/* 1. BRAND & INVOICE HEADER SECTION */}
              <div className="flex flex-row justify-between items-start pb-3">
                {/* Left: Logo & Company Information */}
                <div className="flex items-center gap-3.5 max-w-[450px]">
                  {/* Clean SVG / Logo */}
                  <div className="w-13 h-13 rounded-full border-2 border-[#3B1A6C] flex items-center justify-center bg-white shadow-2xs shrink-0 p-1">
                    <img
                      src="/logo.png"
                      alt="MediChain"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback icon representation
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <span className="text-[#3B1A6C] font-black text-lg hidden only-if-no-img">M</span>
                  </div>

                  <div>
                    <h2 className="text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-1">
                      <span className="text-[#3B1A6C]">Medi</span><span className="text-[#45A834]">Chain</span> Bangladesh
                    </h2>
                    <p className="text-[10px] text-slate-700 leading-tight">
                      Somobay Bank Market Pressclub Rangpur
                    </p>
                    <p className="text-[10px] text-slate-700 leading-tight">
                      Mob: 01940681989 | Email: support@medichainbd.com
                    </p>
                  </div>
                </div>

                {/* Right: Sales Invoice Meta */}
                <div className="text-right shrink-0">
                  <div className="text-[16px] font-bold text-slate-800 uppercase tracking-wide leading-tight">
                    SALES INVOICE
                  </div>
                  <div className="text-[11px] font-medium text-slate-700 mt-1">
                    <span className="text-slate-600">Inv #: </span>
                    <span className="font-bold text-slate-900">{invoiceNumber}</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700">
                    {invoiceDate}
                  </div>
                </div>
              </div>

              {/* 2. CUSTOMER & OFFICER METADATA BOX (Framed box matching the photo) */}
              <div className="border border-slate-900 grid grid-cols-12 text-[10.5px] leading-snug mb-3">
                {/* Left side: Bill To Info */}
                <div className="col-span-6 p-2 border-r border-slate-900 space-y-0.5">
                  <div>
                    <span className="font-bold text-slate-900">Bill To: </span>
                    <span className="text-slate-900 font-semibold">{pharmacyName}</span>
                    <span className="text-slate-500 mx-1">|</span>
                    <span className="font-bold text-slate-900">Mob: </span>
                    <span className="text-slate-900 font-mono">{pharmacyPhone}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Address: </span>
                    <span className="text-slate-800">{pharmacyAddress}</span>
                  </div>
                </div>

                {/* Right side: Officer Info */}
                <div className="col-span-6 p-2 space-y-0.5">
                  <div>
                    <span className="font-bold text-slate-900">Officer: </span>
                    <span className="text-slate-900 font-semibold">{officerName}</span>
                    <span className="text-slate-500 mx-1">|</span>
                    <span className="font-bold text-slate-900">Zone: </span>
                    <span className="text-slate-900">{officerZone}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Contact: </span>
                    <span className="text-slate-900 font-mono">{officerContact}</span>
                  </div>
                </div>
              </div>

              {/* 3. SALES INVOICE ITEMS TABLE */}
              <div className="border border-slate-900 overflow-hidden mb-3 avoid-page-break">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-50 text-[10.5px] font-bold text-slate-900">
                      <th className="py-1.5 px-2 text-center border-r border-slate-900 w-9">SL</th>
                      <th className="py-1.5 px-2 text-left border-r border-slate-900 w-20">TYPE</th>
                      <th className="py-1.5 px-2.5 text-left border-r border-slate-900">ITEM NAME</th>
                      <th className="py-1.5 px-2 text-right border-r border-slate-900 w-18">MRP</th>
                      <th className="py-1.5 px-2 text-right border-r border-slate-900 w-18">RATE</th>
                      <th className="py-1.5 px-2 text-center border-r border-slate-900 w-12">QTY</th>
                      <th className="py-1.5 px-2 text-right border-r border-slate-900 w-20">NET DISC</th>
                      <th className="py-1.5 px-2 text-right w-22">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10.5px] divide-y divide-slate-300">
                    {processedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 text-center border-r border-slate-900 text-slate-700 font-mono">
                          {item.sl}
                        </td>
                        <td className="py-1.5 px-2 text-left border-r border-slate-900 text-slate-800">
                          {item.type}
                        </td>
                        <td className="py-1.5 px-2.5 text-left border-r border-slate-900 text-slate-900 font-medium">
                          {item.name}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-slate-900 text-slate-800 font-mono">
                          {item.mrp.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-slate-900 text-slate-900 font-mono font-medium">
                          {item.rate.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-center border-r border-slate-900 text-slate-900 font-mono">
                          {item.qty}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-slate-900 text-slate-800 font-mono">
                          {item.netDiscount.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-900 font-mono font-semibold">
                          {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4. BOTTOM SECTION: BENGALI NOTICES (LEFT) & TOTALS GRID TABLE (RIGHT) */}
              <div className="grid grid-cols-12 gap-3 items-start mb-4 avoid-page-break">
                {/* Left column (6 cols): Bengali legal/delivery notices matching photo */}
                <div className="col-span-6 space-y-2 pt-1">
                  <div className="text-[10.5px] font-bold text-slate-900 leading-normal">
                    “কমপক্ষে ৮০% মূল্যের পণ্য গ্রহণ করতে হবে, নতুবা সম্পূর্ণ অর্ডারটি ফেরত দিতে হবে।”
                  </div>
                  <div className="text-[10.5px] font-bold text-slate-900 leading-normal">
                    “বিক্রিত পণ্য ফেরত যোগ্য নয়।”
                  </div>
                  <div className="text-[9.5px] text-slate-600 leading-tight pt-1">
                    * পণ্য ডেলিভারির সময় পণ্যের মেয়াদ ও ফিজিক্যাল কোয়ালিটি চেক করে বুঝে নিন।
                  </div>

                  {/* Signatures Area */}
                  <div className="grid grid-cols-2 gap-4 pt-10 text-center text-[10px]">
                    <div>
                      <div className="border-t border-slate-500 pt-1 font-bold text-slate-800">
                        Customer Signature
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-slate-500 pt-1 font-bold text-slate-800">
                        Authorized Signature
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column (6 cols): Exact Totals Grid Table */}
                <div className="col-span-6 border border-slate-900 overflow-hidden text-[10.5px]">
                  <table className="w-full border-collapse">
                    <tbody className="divide-y divide-slate-400">
                      <tr>
                        <td className="py-1 px-2.5 font-medium text-slate-800 border-r border-slate-900 w-1/2">
                          Total Qty
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono text-slate-900">
                          {totalQuantity}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2.5 font-medium text-slate-800 border-r border-slate-900">
                          Sub Total
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono text-slate-900">
                          {subTotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2.5 font-medium text-slate-800 border-r border-slate-900">
                          Discount
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono text-slate-900">
                          {extraDiscount.toFixed(2)}
                        </td>
                      </tr>
                      {deliveryCharge > 0 && (
                        <tr>
                          <td className="py-1 px-2.5 font-medium text-slate-800 border-r border-slate-900">
                            Delivery Charge
                          </td>
                          <td className="py-1 px-2.5 text-right font-mono text-slate-900">
                            {deliveryCharge.toFixed(2)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-1 px-2.5 font-medium text-slate-800 border-r border-slate-900">
                          Round (+/-)
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono text-slate-900">
                          {roundAdjustment.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-bold">
                        <td className="py-1 px-2.5 text-slate-900 border-r border-slate-900">
                          Grand Total
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono text-slate-900 font-black">
                          {grandTotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2.5 font-medium text-slate-800 border-r border-slate-900">
                          Payment
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono text-slate-900">
                          {paymentPaid.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="font-bold">
                        <td className="py-1.5 px-2.5 text-slate-900 border-r border-slate-900">
                          Due
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-900 font-black">
                          {dueAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. BOTTOM SOFTWARE COPYRIGHT & PRINT TIMESTAMP FOOTER */}
              <div className="pt-2 border-t border-slate-200 text-center text-[9.5px] text-slate-500 avoid-page-break">
                This Software Is Developed By MediChain LTD. | Printed: {printedTimestamp}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
