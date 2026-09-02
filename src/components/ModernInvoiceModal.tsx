import React, { useRef } from "react";
import { Order, Pharmacy } from "../types";
import { Printer, Download, X, Building2, MapPin, Banknote, ShieldCheck, Truck, Users, ClipboardCheck } from "lucide-react";

interface ModernInvoiceModalProps {
  order: Order;
  pharmacy?: Pharmacy | null;
  onClose: () => void;
}

export default function ModernInvoiceModal({ order, pharmacy, onClose }: ModernInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Format date helper (e.g. 01 May 2024)
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const invoiceDate = formatDate(order.createdAt);
  
  // Calculate due date (default +7 days)
  const calculateDueDate = (dateStr?: string) => {
    try {
      const d = dateStr ? new Date(dateStr) : new Date();
      d.setDate(d.getDate() + 7);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return "08 May 2024";
    }
  };
  const dueDate = calculateDueDate(order.createdAt);

  // Clean IDs
  const cleanId = order.id.replace(/-/g, "").substring(0, 6).toUpperCase();
  const readableNum = order.readableId ? order.readableId.replace("MCH-", "") : cleanId;
  const invoiceNumber = `MCINV-2024-05-${readableNum.padStart(6, "0")}`;
  const orderNumber = `MCORD-2024-05-${readableNum.padStart(6, "0")}`;

  // Customer / Pharmacy details with fallback
  const pharmacyName = order.pharmacyName || pharmacy?.pharmacyName || "WellCare Pharmacy";
  const ownerName = order.pharmacyOwner || pharmacy?.ownerName || pharmacy?.nidOwnerName || "Md. Jamal Uddin";
  const fullAddress = order.pharmacyAddress || order.deliveryAddress || pharmacy?.address || "Vill: Kazipara, Post: Nilphamari Sadar, Nilphamari-5300, Bangladesh";
  const deliveryAddress = order.deliveryAddress || fullAddress;
  const phone = order.pharmacyPhone || pharmacy?.phone || "+880 1712 345 678";
  const licenseNo = order.pharmacyLicense || pharmacy?.licenseNo || "DP-123456";
  const binNo = order.pharmacyBin || pharmacy?.tradeLicenseNo || pharmacy?.tinNumber || "001234567-0203";

  // Items calculation
  const items = order.items || [];
  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

  // MRP and Discount calculation
  let calculatedMrp = 0;
  items.forEach(it => {
    const itemMrp = it.mrp || (it.sellingPrice * 1.25);
    calculatedMrp += itemMrp * (it.quantity || 1);
  });

  const totalMrp = order.totalMrp && order.totalMrp > 0 ? order.totalMrp : calculatedMrp;
  const totalAmount = order.totalAmount || 0;
  const totalSavings = order.totalSavings && order.totalSavings > 0 ? order.totalSavings : Math.max(0, totalMrp - totalAmount);
  const deliveryCharge = totalAmount > 0 && totalAmount < 10000 ? 0 : 0; // standard wholesale threshold / promo
  const subtotal = Math.max(0, totalAmount - deliveryCharge);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Open backend PDF invoice endpoint in new window or trigger browser print
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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 md:p-6 animate-fade-in"
    >
      <div 
        id="invoice-modal-dialog" 
        className="w-full max-w-5xl my-4 sm:my-8 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* ==================== ACTION BAR (HIDDEN IN PRINT) ==================== */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold">
              ৳
            </div>
            <div>
              <div className="text-xs font-black tracking-wide flex items-center gap-2">
                <span>চালান রসিদ / OFFICIAL INVOICE</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[10px]">
                  {order.readableId || cleanId}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                মুদ্রণ বা পিডিএফ ডাউনলোডের জন্য প্রস্তুত (Standard A4 Format)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন (Print)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>ডাউনলোড PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ==================== INVOICE DOCUMENT CANVAS (#medichain-printable-invoice) ==================== */}
        <div className="p-3 sm:p-6 md:p-8 bg-slate-100 overflow-x-auto flex justify-center">
          <div
            ref={invoiceRef}
            id="medichain-printable-invoice"
            className="w-full max-w-[840px] bg-white text-slate-900 shadow-xl rounded-2xl p-6 sm:p-8 font-sans border border-slate-200 space-y-5"
            style={{
              minWidth: "720px",
              fontFamily: "'Li Alinur Banglaborno', 'Plus Jakarta Sans', system-ui, sans-serif"
            }}
          >
            {/* 1. HEADER SECTION */}
            <div className="flex flex-row justify-between items-start border-b border-slate-200 pb-5 gap-4">
              {/* Left: Brand Logo & Tagline */}
              <div className="flex items-start gap-3 shrink-0">
                <img
                  src="/logo.png"
                  alt="MediChain"
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div>
                  <div className="text-2xl font-black tracking-tight leading-none">
                    <span className="text-[#3B1A6C]">Medi</span>
                    <span className="text-[#45A834]">Chain</span>
                  </div>
                  <div className="text-xs font-black text-[#3B1A6C] mt-1.5 tracking-wide">
                    ফার্মেসির স্মার্ট পার্টনার
                  </div>
                </div>
              </div>

              {/* Center: Company Details */}
              <div className="text-xs text-slate-600 text-left sm:text-center leading-relaxed px-2 flex-1 max-w-[280px]">
                <div className="font-black text-slate-900 text-[13px] mb-0.5">
                  MediChain Limited
                </div>
                <div className="text-[11px] text-slate-600">
                  Shorear Tol,Rangpur Sadar,Rangpur, Bangladesh.
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  +8801940681989
                </div>
                <div className="text-[11px] text-slate-600">
                  support@medichainbd.com
                </div>
                <div className="text-[11px] text-[#3B1A6C] font-semibold">
                  www.medichainbd.com
                </div>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px bg-slate-200 self-stretch my-1" />

              {/* Right: INVOICE title & Meta Key-Values */}
              <div className="text-right shrink-0">
                <h1 className="text-3xl font-black text-[#3B1A6C] tracking-tight mb-2 uppercase">
                  INVOICE
                </h1>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div className="flex justify-end gap-2">
                    <span className="text-slate-500 font-medium">Invoice No.</span>
                    <span className="font-black text-slate-900 font-mono">{invoiceNumber}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-slate-500 font-medium">Invoice Date</span>
                    <span className="font-bold text-slate-800">{invoiceDate}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-slate-500 font-medium">Due Date</span>
                    <span className="font-bold text-slate-800">{dueDate}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-slate-500 font-medium">Order No.</span>
                    <span className="font-bold text-slate-800 font-mono">{orderNumber}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-slate-500 font-medium">Order Date</span>
                    <span className="font-bold text-slate-800">{invoiceDate}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-slate-500 font-medium">Sales Representative</span>
                    <span className="font-bold text-slate-800">{order.salesRep || "MediChain Rangpur Team"}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-slate-500 font-medium">Currency</span>
                    <span className="font-bold text-slate-800">BDT (৳)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. THREE INFO CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 avoid-page-break">
              {/* Card 1: BILLED TO */}
              <div className="rounded-xl p-3.5 border border-[#5B2D91]/30 bg-[#FBF9FE] relative">
                <div className="flex items-center gap-1.5 text-[#3B1A6C] mb-2">
                  <div className="w-5 h-5 rounded-md bg-[#3B1A6C]/10 flex items-center justify-center text-[#3B1A6C]">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    BILLED TO
                  </span>
                </div>
                <div className="space-y-0.5 text-[11px]">
                  <div className="font-black text-slate-900 text-xs leading-snug">
                    {pharmacyName}
                  </div>
                  <div className="text-slate-600 font-medium">
                    <span className="font-bold text-slate-700">Proprietor:</span> {ownerName}
                  </div>
                  <div className="text-slate-600 leading-tight">
                    {fullAddress}
                  </div>
                  <div className="text-slate-600 font-mono">
                    <span className="font-bold text-slate-700">Phone:</span> {phone}
                  </div>
                  <div className="text-[10px] text-slate-500 pt-0.5">
                    License No: <span className="font-bold text-slate-700">{licenseNo}</span> | BIN: <span className="font-bold text-slate-700">{binNo}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: DELIVER TO */}
              <div className="rounded-xl p-3.5 border border-[#5B2D91]/30 bg-[#FBF9FE] relative">
                <div className="flex items-center gap-1.5 text-[#3B1A6C] mb-2">
                  <div className="w-5 h-5 rounded-md bg-[#3B1A6C]/10 flex items-center justify-center text-[#3B1A6C]">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    DELIVER TO
                  </span>
                </div>
                <div className="space-y-0.5 text-[11px]">
                  <div className="font-black text-slate-900 text-xs leading-snug">
                    {pharmacyName}
                  </div>
                  <div className="text-slate-600 leading-tight">
                    {deliveryAddress}
                  </div>
                  <div className="text-slate-600 font-mono">
                    <span className="font-bold text-slate-700">Phone:</span> {phone}
                  </div>
                </div>
              </div>

              {/* Card 3: PAYMENT METHOD */}
              <div className="rounded-xl p-3.5 border border-[#5B2D91]/30 bg-[#FBF9FE] relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[#3B1A6C] mb-2">
                    <div className="w-5 h-5 rounded-md bg-[#3B1A6C]/10 flex items-center justify-center text-[#3B1A6C]">
                      <Banknote className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      Payment Method
                    </span>
                  </div>
                  <div className="font-black text-slate-900 text-base leading-snug">
                    {order.paymentMethod || "Cash on Delivery"}
                  </div>
                </div>

                <div className="text-[11px] font-extrabold text-[#45A834] mt-2">
                  {order.paymentMethod === "bKash" || order.paymentMethod === "Nagad" 
                    ? "ডিজিটাল পেমেন্ট সম্পন্ন" 
                    : "শুধুমাত্র ক্যাশ অন ডেলিভারি"}
                </div>
              </div>
            </div>

            {/* 3. 9-COLUMN ITEMS TABLE */}
            <div className="overflow-hidden rounded-xl border border-slate-200 avoid-page-break">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#3B1A6C] text-white text-[11px] font-bold">
                    <th className="py-2.5 px-2 text-center w-8">SL</th>
                    <th className="py-2.5 px-3 text-left">Product Name<br /><span className="text-[9px] font-normal opacity-85">(Generic Name)</span></th>
                    <th className="py-2.5 px-2 text-center">Company</th>
                    <th className="py-2.5 px-2 text-center">Strength</th>
                    <th className="py-2.5 px-2 text-center">Pack Size</th>
                    <th className="py-2.5 px-2 text-right">MRP (৳)</th>
                    <th className="py-2.5 px-2 text-center">Discount<br />(%)</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Total Price (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {items.map((item, index) => {
                    const itemMrp = item.mrp || (item.sellingPrice * 1.25);
                    const unitPrice = item.sellingPrice || (item.subtotal / (item.quantity || 1));
                    const discount = item.discountPercentage !== undefined 
                      ? item.discountPercentage 
                      : (itemMrp > unitPrice ? Math.round(((itemMrp - unitPrice) / itemMrp) * 100) : 0);
                    const itemTotal = item.subtotal || (unitPrice * item.quantity);

                    return (
                      <tr 
                        key={index} 
                        className={index % 2 === 1 ? "bg-[#FBF9FD]/60" : "bg-white"}
                      >
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-black text-slate-900 leading-tight">
                            {item.name}
                          </div>
                          {item.genericName && (
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                              ({item.genericName})
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-700 font-medium">
                          {item.company || "MediChain"}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-700 font-medium">
                          {item.strength || "—"}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-700 font-medium">
                          {item.packSize || "100 Tablets"}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-700">
                          {itemMrp.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black text-[#45A834] font-mono">
                          {discount > 0 ? `${discount}%` : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black text-slate-800 font-mono">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                          {itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sub-Table Row: Total Items & Quantity */}
            <div className="flex justify-between items-center text-xs font-black text-slate-900 px-1 pt-1">
              <div>Total Items: {items.length}</div>
              <div className="mr-8">Total Quantity: {totalQuantity}</div>
            </div>

            {/* 4. TERMS, SIGNATURE & FINANCIAL TOTALS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2 avoid-page-break">
              {/* Left Column (5 cols): Terms & Conditions */}
              <div className="md:col-span-5 space-y-1.5">
                <div className="text-xs font-black text-[#3B1A6C] tracking-wide uppercase">
                  Terms & Conditions
                </div>
                <ul className="text-[10px] text-slate-700 space-y-1 leading-snug">
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#3B1A6C] font-bold">•</span>
                    <span>পণ্য ডেলিভারির সময় ভালোভাবে যাচাই করে নিন।</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#3B1A6C] font-bold">•</span>
                    <span>খোলা/ব্যবহৃত পণ্য ফেরত বা পরিবর্তনযোগ্য নয়।</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#3B1A6C] font-bold">•</span>
                    <span>নির্ধারিত সময়ের মধ্যে পেমেন্ট সম্পন্ন করতে হবে।</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#3B1A6C] font-bold">•</span>
                    <span>পেমেন্ট ক্যাশ অন ডেলিভারিতে প্রদান করতে হবে।</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#3B1A6C] font-bold">•</span>
                    <span>মাল বিক্রয়ের পর ফেরত নেওয়া হবে না।</span>
                  </li>
                </ul>
              </div>

              {/* Middle Column (3 cols): Authorized Signature */}
              <div className="md:col-span-3 flex flex-col items-center justify-end h-full pt-4 md:pt-8 text-center">
                {/* SVG Authentic Signature */}
                <div className="w-32 h-12 flex items-center justify-center">
                  <svg
                    viewBox="0 0 160 50"
                    className="w-full h-full text-slate-800"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10,35 C25,15 35,45 45,25 C55,10 65,30 80,18 C95,8 105,38 120,20 C130,10 145,25 155,22" />
                    <path d="M30,30 C50,32 90,28 140,26" />
                  </svg>
                </div>
                <div className="w-36 border-t border-slate-400 pt-1">
                  <div className="text-[11px] font-black text-[#3B1A6C]">
                    Authorized Signature
                  </div>
                  <div className="text-[10px] text-slate-700 font-bold">
                    MediChain Limited
                  </div>
                </div>
              </div>

              {/* Right Column (4 cols): Totals Breakdown */}
              <div className="md:col-span-4 rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="divide-y divide-slate-100 text-[11px] bg-white">
                  <div className="flex justify-between py-1.5 px-3 text-slate-600">
                    <span className="font-medium">Total MRP</span>
                    <span className="font-mono font-bold text-slate-800">৳{totalMrp.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-3 text-[#45A834]">
                    <span className="font-bold">Total Discount</span>
                    <span className="font-mono font-bold">-৳{totalSavings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-3 text-slate-700">
                    <span className="font-bold">Subtotal</span>
                    <span className="font-mono font-bold text-slate-900">৳{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-3 text-slate-600">
                    <span className="font-medium">Delivery Charge</span>
                    <span className="font-mono font-bold text-slate-800">৳{deliveryCharge.toFixed(2)}</span>
                  </div>
                </div>

                {/* Grand Total Solid Purple Banner */}
                <div className="bg-[#3B1A6C] text-white py-2.5 px-3.5 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-wider">
                    Grand Total
                  </span>
                  <span className="text-lg font-black font-mono tracking-tight">
                    ৳{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. TRUST BADGES / VALUE PROPOSITION BAR */}
            <div className="rounded-2xl border border-slate-200 bg-[#FAF8FD] p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center text-slate-800 avoid-page-break">
              {/* Box 1: Thanks */}
              <div className="flex items-center gap-2.5 sm:col-span-1 border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-[#3B1A6C] shrink-0">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-black text-[#3B1A6C] leading-tight">
                    Thank you for choosing MediChain!
                  </div>
                  <div className="text-[9px] text-slate-600 mt-0.5">
                    আমাদের উপর আস্থা রাখার জন্য ধন্যবাদ।
                  </div>
                  <div className="text-[8.5px] font-bold text-[#45A834] mt-0.5">
                    100% অরিজিনাল • সেরা দাম • দ্রুত ডেলিভারি
                  </div>
                </div>
              </div>

              {/* Box 2: 100% Original Medicine */}
              <div className="flex items-center gap-2 sm:justify-center border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0 px-2">
                <ShieldCheck className="w-6 h-6 text-[#3B1A6C] shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] font-black text-slate-900 leading-none">
                    100%
                  </div>
                  <div className="text-[10px] text-slate-600 font-bold mt-0.5">
                    অরিজিনাল ঔষধ
                  </div>
                </div>
              </div>

              {/* Box 3: Fast & Reliable Delivery */}
              <div className="flex items-center gap-2 sm:justify-center border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0 px-2">
                <Truck className="w-6 h-6 text-[#3B1A6C] shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] font-black text-slate-900 leading-tight">
                    দ্রুত ও নির্ভরযোগ্য
                  </div>
                  <div className="text-[10px] text-slate-600 font-bold mt-0.5">
                    ডেলিভারি
                  </div>
                </div>
              </div>

              {/* Box 4: 3000+ Pharmacy Partners */}
              <div className="flex items-center gap-2 sm:justify-center px-2">
                <Users className="w-6 h-6 text-[#3B1A6C] shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] font-black text-slate-900 leading-tight">
                    3000+ ফার্মেসির
                  </div>
                  <div className="text-[10px] text-slate-600 font-bold mt-0.5">
                    বিশ্বস্ত পার্টনার
                  </div>
                </div>
              </div>
            </div>

            {/* 6. FOOTER BAR */}
            <div className="bg-[#3B1A6C] text-white py-2.5 px-4 rounded-xl text-center avoid-page-break">
              <div className="text-xs font-black tracking-wider">
                MediChain Limited
              </div>
              <div className="text-[10px] text-purple-200 mt-0.5 leading-relaxed">
                Shorear Tol,Rangpur Sadar,Rangpur, Bangladesh | +8801940681989 | support@medichainbd.com | www.medichainbd.com
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
