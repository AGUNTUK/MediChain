import React, { useRef, useState, useEffect } from "react";
import { Order, Pharmacy, OrderItem } from "../types";
import { DEFAULT_DELIVERY_CHARGE } from "../constants/delivery";
import { 
  Printer, 
  Download, 
  X, 
  Maximize2,
  ZoomIn,
  ZoomOut,
  CheckCircle2
} from "lucide-react";

interface ModernInvoiceModalProps {
  order: Order;
  pharmacy?: Pharmacy | null;
  onClose: () => void;
}

/**
 * Intelligent helper to resolve item pharmaceutical dosage/category type
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
  if (cat.includes("combi") || name.includes("combi")) return "Combi";
  
  if (item.category && item.category.trim()) {
    return item.category.charAt(0).toUpperCase() + item.category.slice(1);
  }
  return "Tablet";
}

export default function ModernInvoiceModal({ order, pharmacy, onClose }: ModernInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const BASE_INVOICE_WIDTH = 820;
  const [zoomMode, setZoomMode] = useState<"fit" | "100%" | "custom">("fit");
  const [customZoom, setCustomZoom] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [invoiceHeight, setInvoiceHeight] = useState<number>(1080);

  useEffect(() => {
    const updateDimensions = () => {
      if (!canvasContainerRef.current) return;
      const containerWidth = canvasContainerRef.current.clientWidth;
      if (invoiceRef.current) {
        setInvoiceHeight(invoiceRef.current.scrollHeight || invoiceRef.current.offsetHeight || 1080);
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

  // Format date helper matching e.g. 08-SEP-2026
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

  const invoiceDate = formatInvoiceDate(order.createdAt);
  
  // Invoice Number & Order Ref formatting
  const cleanId = order.id.replace(/-/g, "").substring(0, 6).toUpperCase();
  const readableNum = order.readableId ? order.readableId.replace("MCH-", "").replace("INV-", "") : cleanId;
  const invoiceNumber = `INV-${readableNum}`;
  const orderRef = order.readableId || `MCH-${cleanId}`;

  // Customer / Pharmacy details with graceful fallback
  const pharmacyName = order.pharmacyName || pharmacy?.pharmacyName || "Registered Pharmacy Partner";
  const proprietorName = pharmacy?.ownerName || (pharmacy as any)?.owner_name || (order as any).pharmacyOwner || (order as any).customerName || "Proprietor";
  const pharmacyPhone = order.pharmacyPhone || pharmacy?.phone || "01924-243556";
  const pharmacyAddress = order.pharmacyAddress || order.deliveryAddress || pharmacy?.address || "Rangpur Division, Bangladesh";
  
  let drugLicense = pharmacy?.licenseNo || "";
  if (!drugLicense && (pharmacy as any)?.license_information) {
    try {
      const parsed = typeof (pharmacy as any).license_information === "string" 
        ? JSON.parse((pharmacy as any).license_information) 
        : (pharmacy as any).license_information;
      drugLicense = parsed.drugLicense || parsed.licenseNo || "";
    } catch (e) {}
  }
  if (!drugLicense) drugLicense = "DGDA-DL-2026-9988";

  // Payment Status & Delivery Fee (Strict platform constant)
  const isPaid = order.paymentStatus === "Paid";
  const paymentMethod = "Cash on Delivery";
  const dueDate = invoiceDate;
  const deliveryCharge = DEFAULT_DELIVERY_CHARGE; // Exactly ৳40 platform-wide constant

  // Filter out any items that were marked unavailable through Order Amendment
  const activeItems = (order.items || []).filter((it: any) => !it.unavailable && !it.isUnavailable);
  const totalQuantity = activeItems.reduce((acc, it) => acc + (it.quantity || 0), 0);

  // Line item processing with exact mathematical relationships:
  // Net Disc = (MRP - Rate) * Qty
  // Total = Rate * Qty
  let subtotalMedicines = 0;
  let totalMrpSum = 0;

  const processedItems = activeItems.map((item, index) => {
    const type = resolveItemType(item);
    const qty = item.quantity || 1;
    const rate = item.sellingPrice || (item.subtotal ? item.subtotal / qty : 0);
    const mrp = item.mrp && item.mrp >= rate ? item.mrp : Math.round(rate * 1.22 * 100) / 100;
    
    const unitDiscount = Math.max(0, mrp - rate);
    const netDiscount = Math.round(unitDiscount * qty * 100) / 100;
    const itemTotal = Math.round(rate * qty * 100) / 100;

    subtotalMedicines += itemTotal;
    totalMrpSum += mrp * qty;

    return {
      sl: index + 1,
      type,
      name: item.name,
      strength: item.strength || "",
      packSize: item.packSize || "",
      mrp,
      rate,
      qty,
      netDiscount,
      total: itemTotal
    };
  });

  const wholesaleSavings = Math.max(0, totalMrpSum - subtotalMedicines);
  const netPayable = subtotalMedicines + deliveryCharge;
  const amountDue = isPaid ? 0.00 : netPayable;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const downloadUrl = `/api/orders/${order.id}/invoice`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${invoiceNumber}.pdf`;
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
        <div className="no-print bg-[#14161B] text-white px-3 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A3E635] font-bold text-sm shrink-0">
              ৳
            </div>
            <div>
              <div className="text-xs font-black tracking-wide flex items-center gap-1.5 sm:gap-2">
                <span className="truncate max-w-[140px] sm:max-w-none text-[#F4F4F5]">INVOICE</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-[#C084FC] border border-purple-500/30 font-mono text-[10px]">
                  {invoiceNumber}
                </span>
              </div>
              <p className="text-[10px] text-[#9CA3AF] hidden sm:block">
                Official B2B Pharmaceutical Sales Invoice
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
                    ? "bg-[#7C3AED] text-white shadow-xs" 
                    : "text-slate-400 hover:text-white"
                }`}
                title="Fit Screen"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="text-[10px] sm:text-xs">Fit</span>
              </button>

              <button
                onClick={handleActualSize}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  zoomMode === "100%" 
                    ? "bg-[#7C3AED] text-white shadow-xs" 
                    : "text-slate-400 hover:text-white"
                }`}
                title="100% Size"
              >
                <span className="text-[10px] sm:text-xs">100%</span>
              </button>

              <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.35}
                className="p-1 hover:text-white text-slate-400 disabled:opacity-40 cursor-pointer transition-colors"
                title="Zoom Out"
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
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold py-1.5 px-3 sm:px-3.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/30 cursor-pointer active:scale-95"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="font-bold">Print</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-1.5 px-2.5 sm:px-3 rounded-xl flex items-center gap-1 transition-all border border-slate-700 cursor-pointer active:scale-95"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer ml-0.5"
              title="Close"
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
              className="bg-white text-slate-900 shadow-xl rounded-none font-sans border border-slate-300 text-[11px] relative overflow-hidden"
              style={{
                width: `${BASE_INVOICE_WIDTH}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              }}
            >
              {/* ==================== WATERMARK ==================== */}
              {/* Actual MediChain logo, large (~620px), centered, rotated -8deg, 4.5% opacity */}
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
                aria-hidden="true"
              >
                <img 
                  src="/logo.png" 
                  alt="" 
                  className="w-[620px] h-[620px] max-w-none object-contain opacity-[0.045] -rotate-[8deg]" 
                />
              </div>

              {/* ==================== 1. HEADER BAND ==================== */}
              {/* Full-width dark diagonal gradient (#14161B -> #1E1024 -> #2B1338) */}
              <div className="relative z-10">
                <div 
                  className="px-6 py-5 text-white flex flex-row justify-between items-center"
                  style={{
                    background: "linear-gradient(135deg, #14161B 0%, #1E1024 50%, #2B1338 100%)"
                  }}
                >
                  {/* Left Side: Logo + Brand + Tagline + Contact Info */}
                  <div className="flex items-center gap-3.5">
                    <img
                      src="/logo.png"
                      alt="MediChain"
                      className="w-[52px] h-[52px] object-contain rounded-xl shrink-0 p-0.5 bg-white/5 border border-white/10"
                    />
                    <div>
                      <h1 className="text-[22px] font-bold text-[#F4F4F5] tracking-tight leading-none mb-1">
                        MediChain
                      </h1>
                      <div className="text-[9px] font-bold tracking-[0.2em] text-[#A3E635] uppercase leading-none mb-1.5">
                        SMART PARTNER FOR PHARMACIES
                      </div>
                      <p className="text-[9.5px] text-[#9CA3AF] leading-tight">
                        Shorear Tol, Rangpur Sadar, Rangpur, Bangladesh • Mob: 01940-681989 • support@medichainbd.com
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Invoice Meta */}
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C084FC] mb-0.5">
                      INVOICE
                    </div>
                    <div className="text-[20px] font-black tracking-tight text-[#F4F4F5] leading-none mb-1">
                      {invoiceNumber}
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] space-y-0.5">
                      <div>Date: <span className="text-[#F4F4F5] font-medium">{invoiceDate}</span></div>
                      <div>Order Ref: <span className="font-mono text-[#F4F4F5]">{orderRef}</span></div>
                    </div>
                  </div>
                </div>

                {/* Thin 3px accent line along bottom edge of band (Orchid Purple to Lime Green) */}
                <div 
                  className="h-[3px] w-full"
                  style={{
                    background: "linear-gradient(to right, #A855F7, #A3E635)"
                  }}
                />
              </div>

              {/* Document Body Padding Wrapper */}
              <div className="p-6 sm:p-7 relative z-10">
                {/* ==================== 2. BILLED TO / PAYMENT INFO STRIP ==================== */}
                <div className="grid grid-cols-12 gap-4 pb-4 mb-4 border-b border-slate-200">
                  {/* Left Column: Billed To */}
                  <div className="col-span-7 pr-4 border-r border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#A855F7]">
                      BILLED TO
                    </div>
                    <div className="text-[14px] font-bold text-[#14161B] leading-tight">
                      {pharmacyName}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      Proprietor: <span className="text-slate-800 font-medium">{proprietorName}</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      Drug Lic: <span className="font-mono text-slate-800 font-medium">{drugLicense}</span> • Mob: <span className="font-mono text-slate-800">{pharmacyPhone}</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      {pharmacyAddress}
                    </div>
                  </div>

                  {/* Right Column: Payment Details */}
                  <div className="col-span-5 pl-2 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#A855F7]">
                      PAYMENT
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      Method: <span className="font-semibold text-slate-800">{paymentMethod}</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      Due Date: <span className="font-medium text-slate-800">{dueDate}</span>
                    </div>
                    <div className="pt-0.5">
                      {isPaid ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                          PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ==================== 3. LINE ITEMS TABLE ==================== */}
                {/* Columns: SL | Type | Item Name | MRP | Rate | Qty | Net Disc | Total */}
                <div className="rounded-lg overflow-hidden border border-slate-200 mb-5 avoid-page-break">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#14161B] text-[#F4F4F5] text-[10px] font-bold tracking-wider uppercase">
                        <th className="py-2 px-2 text-center w-9">SL</th>
                        <th className="py-2 px-2.5 text-left w-20">Type</th>
                        <th className="py-2 px-3 text-left">Item Name</th>
                        <th className="py-2 px-2.5 text-right w-20">MRP</th>
                        <th className="py-2 px-2.5 text-right w-20">Rate</th>
                        <th className="py-2 px-2 text-right w-14">Qty</th>
                        <th className="py-2 px-2.5 text-right w-22">Net Disc</th>
                        <th className="py-2 px-3 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] divide-y divide-slate-100">
                      {processedItems.map((item) => (
                        <tr 
                          key={item.sl} 
                          className="even:bg-[#FAFAFB] odd:bg-white hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-2 px-2 text-center font-mono text-[#6B7280]">
                            {item.sl}
                          </td>
                          <td className="py-2 px-2.5 text-left font-bold text-[10px] uppercase text-[#7C3AED]">
                            {item.type}
                          </td>
                          <td className="py-2 px-3 text-left">
                            <span className="font-semibold text-[#14161B]">{item.name}</span>
                            {item.strength && (
                              <span className="text-[10px] text-[#6B7280] font-normal ml-1.5">
                                ({item.strength})
                              </span>
                            )}
                            {item.packSize && !item.name.toLowerCase().includes(item.packSize.toLowerCase()) && (
                              <span className="text-[10px] text-slate-400 font-normal ml-1">
                                • {item.packSize}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono tabular-nums text-[#6B7280]">
                            ৳{item.mrp.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-[#14161B]">
                            ৳{item.rate.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums text-[#14161B]">
                            {item.qty}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-[#65A30D]">
                            ৳{item.netDiscount.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-[#14161B]">
                            ৳{item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ==================== 4. SUMMARY BOX (BOTTOM RIGHT, ~300px) ==================== */}
                <div className="flex flex-row justify-end mb-6 avoid-page-break">
                  <div className="w-full sm:w-[320px] space-y-2 text-[11px]">
                    {/* Row 1: Subtotal (Medicines) */}
                    <div className="flex justify-between items-center px-1 text-[#6B7280]">
                      <span>Subtotal (Medicines)</span>
                      <span className="font-mono tabular-nums text-slate-800 font-medium">
                        ৳{subtotalMedicines.toFixed(2)}
                      </span>
                    </div>

                    {/* Row 2: Wholesale Savings */}
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[#6B7280]">Wholesale Savings</span>
                      <span className="font-mono tabular-nums font-bold text-[#65A30D]">
                        -৳{wholesaleSavings.toFixed(2)}
                      </span>
                    </div>

                    {/* Row 3: Delivery Charge (Fixed platform-wide ৳40) */}
                    <div className="flex justify-between items-center px-1 text-[#6B7280]">
                      <span>Delivery Charge</span>
                      <span className="font-mono tabular-nums text-slate-800 font-medium">
                        ৳{deliveryCharge.toFixed(2)}
                      </span>
                    </div>

                    {/* Row 4: Net Payable (Filled rounded card, purple gradient #A855F7 to #7C3AED) */}
                    <div 
                      className="rounded-xl p-3 text-white flex justify-between items-center shadow-md"
                      style={{
                        background: "linear-gradient(to right, #A855F7, #7C3AED)"
                      }}
                    >
                      <span className="font-bold text-xs uppercase tracking-wide">Net Payable</span>
                      <span className="font-mono tabular-nums text-base sm:text-lg font-black">
                        ৳{netPayable.toFixed(2)}
                      </span>
                    </div>

                    {/* Row 5: Amount Due (Light grey background with border, reflecting COD status) */}
                    <div className="rounded-xl p-2.5 bg-[#FAFAFB] border border-slate-200 flex justify-between items-center">
                      <span className="font-medium text-slate-700 text-[11px]">
                        Amount Due {isPaid ? "(Paid)" : "(Cash on Delivery)"}
                      </span>
                      <span className={`font-mono tabular-nums font-bold text-[13px] ${isPaid ? "text-[#166534]" : "text-[#14161B]"}`}>
                        ৳{amountDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ==================== 5. FOOTER SECTION ==================== */}
                <div className="border-t border-dashed border-slate-300 pt-4 mt-2 avoid-page-break space-y-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#A855F7] mb-1.5">
                      TERMS & CONDITIONS
                    </div>
                    <ol className="list-decimal list-inside text-[9.5px] text-[#6B7280] space-y-1 leading-relaxed">
                      <li>
                        <strong className="text-slate-700">FEFO Policy:</strong> All pharmaceutical inventory is distributed strictly under First Expired, First Out (FEFO) regulatory compliance.
                      </li>
                      <li>
                        <strong className="text-slate-700">COD Payment:</strong> Cash on Delivery (COD) collection is mandatory upon physical receipt. At least 80% invoice value goods must be received or full order returned.
                      </li>
                      <li>
                        <strong className="text-slate-700">Return Policy:</strong> Sold pharmaceuticals are non-refundable once accepted and physically inspected by the licensed pharmacist.
                      </li>
                      <li>
                        <strong className="text-slate-700">Computer-Generated:</strong> This is an authentic digital tax sales invoice generated by MediChain systems and does not require a physical seal.
                      </li>
                    </ol>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 gap-8 pt-10 pb-4">
                    <div className="text-center">
                      <div className="border-t border-slate-400 mx-auto w-32"></div>
                      <div className="text-[10px] text-[#6B7280] mt-1.5">Depot/Warehouse Staff</div>
                    </div>
                    <div className="text-center">
                      <div className="border-t border-slate-400 mx-auto w-32"></div>
                      <div className="text-[10px] text-[#6B7280] mt-1.5">Delivery Rider</div>
                    </div>
                    <div className="text-center">
                      <div className="border-t border-slate-400 mx-auto w-32"></div>
                      <div className="text-[10px] text-[#6B7280] mt-1.5">Received By</div>
                    </div>
                  </div>

                  {/* Bottom Row: Verification Hash & Verified by MediChain */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px]">
                    <div className="font-mono text-[#9CA3AF]">
                      Verification Ref: {orderRef}-{cleanId}
                    </div>
                    <div className="font-bold text-[#65A30D] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ Verified by MediChain</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
