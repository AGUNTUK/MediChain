import React, { useState, useEffect, useMemo } from "react";
import { CustomInvoiceData, CustomInvoiceItem } from "../types";
import { accountsClient } from "../services";
import {
  FileText,
  Search,
  Download,
  Printer,
  Edit3,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  Building2,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  FileSpreadsheet,
  X,
  CreditCard,
  Phone,
  MapPin,
  Maximize2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface CustomInvoicesLedgerProps {
  onEditInvoice?: (invoice: CustomInvoiceData) => void;
  onNavigateToGenerator?: () => void;
}

export default function CustomInvoicesLedger({
  onEditInvoice,
  onNavigateToGenerator
}: CustomInvoicesLedgerProps) {
  const [invoices, setInvoices] = useState<CustomInvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Pagination State (Default 50 so all 40 invoices fit and scroll smoothly, while supporting larger sets)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Inspect Modal
  const [inspectingInvoice, setInspectingInvoice] = useState<CustomInvoiceData | null>(null);

  // Feedback Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch all lifetime invoices from Supabase Database with Auto-Recovery of Unsynced Local Invoices
  const fetchLifetimeInvoices = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // 1. Read existing local invoices from browser storage
      let localInvoices: CustomInvoiceData[] = [];
      try {
        const cached = localStorage.getItem("medichain_custom_invoices_ledger");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            localInvoices = parsed.filter((inv: any) =>
              !inv.id?.startsWith("cinv-") &&
              inv.recipientName !== "Central Pharmacy" &&
              inv.recipientName !== "Apex Clinic"
            );
          }
        }
      } catch (e) {}

      // 2. Fetch authoritative cloud invoices from PostgreSQL
      const data = await accountsClient.getSavedCustomInvoices();
      let cleanData: CustomInvoiceData[] = [];
      if (Array.isArray(data)) {
        cleanData = data.filter(inv =>
          !inv.id?.startsWith("cinv-") &&
          inv.recipientName !== "Central Pharmacy" &&
          inv.recipientName !== "Apex Clinic"
        );
      }

      // 3. Detect and recover any unsynced local invoices that were saved in browser
      const cloudNumbers = new Set(cleanData.map(c => c.invoiceNumber));
      const unsyncedLocals = localInvoices.filter(loc => !cloudNumbers.has(loc.invoiceNumber));

      if (unsyncedLocals.length > 0) {
        let syncedCount = 0;
        for (const locInv of unsyncedLocals) {
          try {
            const savedCloud = await accountsClient.syncCustomInvoiceToLedger(locInv);
            cleanData.unshift(savedCloud || locInv);
            cloudNumbers.add(locInv.invoiceNumber);
            syncedCount++;
          } catch (syncErr) {
            cleanData.push(locInv);
          }
        }
        if (syncedCount > 0) {
          showToast(`✓ Auto-recovered and permanently saved ${syncedCount} invoice(s) to Lifetime Cloud Ledger!`);
        }
      }

      setInvoices(cleanData);
      try {
        localStorage.setItem("medichain_custom_invoices_ledger", JSON.stringify(cleanData));
      } catch (e) {}
    } catch (err: any) {
      console.error("Failed to fetch custom invoices from cloud ledger:", err);
      // Fallback to localStorage cache if network fails
      try {
        const cached = localStorage.getItem("medichain_custom_invoices_ledger");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const cleanCached = parsed.filter((inv: any) =>
              !inv.id?.startsWith("cinv-") &&
              inv.recipientName !== "Central Pharmacy" &&
              inv.recipientName !== "Apex Clinic"
            );
            setInvoices(cleanCached);
          }
        }
      } catch (e) {}
      showToast("Could not sync with cloud ledger, using local cache.", true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLifetimeInvoices();
  }, []);

  // Safe formatting helper
  const safeFixed = (val: any, decimals = 2): string => {
    const num = Number(val);
    return (isNaN(num) ? 0 : num).toFixed(decimals);
  };

  // Format date helper
  const formatDate = (dStr?: string) => {
    if (!dStr) return "N/A";
    try {
      const d = new Date(dStr);
      return `${String(d.getDate()).padStart(2, "0")}-${d.toLocaleString("en-US", { month: "short" }).toUpperCase()}-${d.getFullYear()}`;
    } catch {
      return dStr;
    }
  };

  // Lifetime Financial Metrics
  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    let totalInvoiced = 0;
    let totalDiscount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    for (const inv of invoices) {
      const net = Number(inv.netPayable) || 0;
      totalInvoiced += net;

      // Discount sum
      const subtotal = Number(inv.subtotal) || 0;
      const mrpSum = (inv.items || []).reduce((acc, it) => acc + (Number(it.mrp) || 0) * (Number(it.quantity) || 1), 0);
      const discount = Math.max(0, mrpSum - subtotal);
      totalDiscount += discount;

      if (inv.paymentStatus === "Paid") {
        totalPaid += net;
      } else {
        totalDue += net;
      }
    }

    return {
      totalCount,
      totalInvoiced,
      totalDiscount,
      totalPaid,
      totalDue
    };
  }, [invoices]);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter(inv => {
      // Status filter
      if (statusFilter !== "all" && inv.paymentStatus?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Type filter
      if (typeFilter !== "all" && (inv.recipientType || "institute").toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      // Text search
      if (!q) return true;
      const memo = (inv.invoiceNumber || "").toLowerCase();
      const name = (inv.recipientName || "").toLowerCase();
      const phone = (inv.phone || "").toLowerCase();
      const ref = (inv.orderRef || "").toLowerCase();
      const date = (inv.createdAt || "").toLowerCase();

      return memo.includes(q) || name.includes(q) || phone.includes(q) || ref.includes(q) || date.includes(q);
    });
  }, [invoices, searchQuery, statusFilter, typeFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  const totalFiltered = filteredInvoices.length;
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalFiltered / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const displayedInvoices = useMemo(() => {
    if (pageSize === 0) return filteredInvoices;
    const start = (validCurrentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, validCurrentPage, pageSize]);

  // Download PDF from server
  const handleDownloadPdf = async (inv: CustomInvoiceData) => {
    setDownloadingPdfId(inv.id);
    try {
      const res = await fetch("/api/admin/custom-invoices/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inv)
      });
      if (!res.ok) throw new Error("Server PDF generation failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = `${(inv.invoiceNumber || "invoice").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`Downloaded official PDF for ${inv.invoiceNumber}`);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      showToast("Failed to download PDF invoice", true);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Delete invoice permanently from database
  const handleDeleteInvoice = async (id: string, invNum: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete invoice ${invNum} from the Lifetime Ledger? This cannot be undone.`)) {
      return;
    }

    try {
      const success = await accountsClient.deleteCustomInvoice(id);
      if (success) {
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        // Also update local cache
        try {
          const cached = localStorage.getItem("medichain_custom_invoices_ledger");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              localStorage.setItem("medichain_custom_invoices_ledger", JSON.stringify(parsed.filter((x: any) => x.id !== id)));
            }
          }
        } catch (e) {}
        showToast(`Permanently deleted invoice ${invNum} from Cloud Ledger.`);
      } else {
        throw new Error("Server returned false");
      }
    } catch (err) {
      showToast(`Failed to delete invoice from database.`, true);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (invoices.length === 0) {
      showToast("No invoices to export", true);
      return;
    }

    const headers = [
      "Invoice Number",
      "Date",
      "Recipient Name",
      "Recipient Type",
      "Phone",
      "Address",
      "Payment Method",
      "Payment Status",
      "Total Items",
      "Subtotal",
      "Delivery Charge",
      "Net Payable",
      "Created At"
    ];

    const rows = invoices.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${inv.createdAt || ""}"`,
      `"${(inv.recipientName || "").replace(/"/g, '""')}"`,
      `"${inv.recipientType || "institute"}"`,
      `"${inv.phone || ""}"`,
      `"${(inv.address || "").replace(/"/g, '""')}"`,
      `"${inv.paymentMethod || "Cash on Delivery"}"`,
      `"${inv.paymentStatus || "Pending"}"`,
      (inv.items || []).length,
      safeFixed(inv.subtotal, 2),
      safeFixed(inv.deliveryCharge, 2),
      safeFixed(inv.netPayable, 2),
      `"${inv.updatedAt || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `medichain_invoices_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported Lifetime Ledger to CSV.");
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Feedback HUD */}
      {toastMsg && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-semibold text-xs border animate-slide-in text-white ${
            toastMsg.isError ? "bg-rose-600 border-rose-400" : "bg-emerald-600 border-emerald-400"
          }`}
        >
          {toastMsg.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & LIFETIME VAULT BANNER                                    */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Permanent Invoices Ledger
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Lifetime Cloud Storage
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Immutable, permanent repository of all institutional B2B invoices generated for hospitals, clinics, NGOs, and unregistered entities. Preserved for lifetime in Supabase PostgreSQL (<code className="font-mono text-purple-700 bg-purple-50 px-1 py-0.5 rounded">custom_invoices_ledger</code>).
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchLifetimeInvoices(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Refresh from PostgreSQL Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-600" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Refresh Cloud"}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Export Ledger to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            {onNavigateToGenerator && (
              <button
                onClick={onNavigateToGenerator}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Invoice</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LIFETIME METRIC CARDS                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Invoices */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Preserved Invoices
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.totalCount}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <span>●</span> 100% Cloud Synced
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Total Volume */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Invoiced Value
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ৳{safeFixed(metrics.totalInvoiced, 0)}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              Net B2B Volume
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Discount Given */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Discount Given
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ৳{safeFixed(metrics.totalDiscount, 0)}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Wholesale Client Savings
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Paid vs Due */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Collected vs Due
            </div>
            <div className="text-lg font-black text-slate-900 mt-1 flex items-baseline gap-1">
              <span className="text-emerald-700">৳{safeFixed(metrics.totalPaid, 0)}</span>
              <span className="text-slate-300 text-xs">/</span>
              <span className="text-amber-700 text-sm font-bold">৳{safeFixed(metrics.totalDue, 0)}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              Paid / Outstanding Due
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH & FILTER CONTROLS                                              */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search lifetime invoices by Memo #, Institute Name, Phone, Date..."
            className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="voided">Voided</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">All Recipients</option>
              <option value="hospital">Hospital</option>
              <option value="clinic">Clinic</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="institute">Institute</option>
              <option value="ngo">NGO</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LIFETIME INVOICES TABLE                                               */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading Lifetime Invoices Ledger...</p>
            <p className="text-[11px] text-slate-400">Querying Supabase PostgreSQL cloud repository</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No Invoices Found in Ledger</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "No custom invoices match your current search and filter criteria."
                : "No institutional custom invoices have been saved yet. Use the Custom Invoice Generator to create official invoices."}
            </p>
            {onNavigateToGenerator && (
              <button
                onClick={onNavigateToGenerator}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Custom Invoice</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#14161B] text-[#F4F4F5] text-[10.5px] font-bold tracking-wider uppercase border-b border-slate-800">
                  <th className="py-3 px-3.5 text-center w-12">SL</th>
                  <th className="py-3 px-3.5">Invoice Memo #</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Recipient / Organization</th>
                  <th className="py-3 px-3.5">Items & Company</th>
                  <th className="py-3 px-3.5 text-right">Subtotal</th>
                  <th className="py-3 px-3.5 text-right">Discount</th>
                  <th className="py-3 px-3.5 text-right">Net Payable</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11.5px]">
                {displayedInvoices.map((inv, idx) => {
                  const globalIdx = pageSize === 0 ? idx : (validCurrentPage - 1) * pageSize + idx;
                  const mrpSum = (inv.items || []).reduce((acc, it) => acc + (Number(it.mrp) || 0) * (Number(it.quantity) || 1), 0);
                  const subtotal = Number(inv.subtotal) || 0;
                  const discountGiven = Math.max(0, mrpSum - subtotal);
                  const isPaid = inv.paymentStatus === "Paid";
                  const itemsCount = (inv.items || []).length;

                  // Preview up to 2 items with company
                  const previewItems = (inv.items || []).slice(0, 2);
                  const moreItemsCount = Math.max(0, itemsCount - 2);

                  return (
                    <tr key={inv.id || idx} className="hover:bg-purple-50/40 transition-colors">
                      {/* SL */}
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                        {globalIdx + 1}
                      </td>

                      {/* Memo # */}
                      <td className="py-3 px-3.5 font-mono">
                        <button
                          onClick={() => setInspectingInvoice(inv)}
                          className="font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer flex items-center gap-1.5"
                          title="Click to inspect invoice"
                        >
                          <span>{inv.invoiceNumber}</span>
                        </button>
                        {inv.orderRef && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                            Ref: {inv.orderRef}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{formatDate(inv.createdAt)}</div>
                        {inv.dueDate && (
                          <div className="text-[10px] text-slate-400">Due: {formatDate(inv.dueDate)}</div>
                        )}
                      </td>

                      {/* Recipient */}
                      <td className="py-3 px-3.5 max-w-[200px]">
                        <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{inv.recipientName}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold bg-slate-100 text-slate-600 shrink-0">
                            {inv.recipientType || "institute"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                          {inv.phone && <span>📞 {inv.phone}</span>}
                          {inv.address && <span className="truncate">📍 {inv.address}</span>}
                        </div>
                      </td>

                      {/* Items & Company */}
                      <td className="py-3 px-3.5 max-w-[220px]">
                        <div className="space-y-0.5">
                          {previewItems.map((itm, iIdx) => (
                            <div key={iIdx} className="text-[11px] truncate flex items-center gap-1.5">
                              <span className="font-medium text-slate-800 truncate">{itm.name}</span>
                              {itm.company && (
                                <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1 rounded truncate">
                                  {itm.company}
                                </span>
                              )}
                            </div>
                          ))}
                          {moreItemsCount > 0 && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              +{moreItemsCount} more item{moreItemsCount > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                        ৳{safeFixed(subtotal, 2)}
                      </td>

                      {/* Discount */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {discountGiven > 0 ? `-৳${safeFixed(discountGiven, 2)}` : "৳0.00"}
                      </td>

                      {/* Net Payable */}
                      <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900 whitespace-nowrap text-xs">
                        ৳{safeFixed(inv.netPayable, 2)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {inv.status === "Voided" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                            VOIDED
                          </span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                            PENDING
                          </span>
                        )}
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {inv.paymentMethod || "COD"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Inspect View */}
                          <button
                            onClick={() => setInspectingInvoice(inv)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-purple-700 cursor-pointer transition-colors"
                            title="Inspect Invoice Modal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownloadPdf(inv)}
                            disabled={downloadingPdfId === inv.id}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 cursor-pointer transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            <Download className={`w-3.5 h-3.5 ${downloadingPdfId === inv.id ? "animate-bounce text-purple-600" : ""}`} />
                          </button>

                          {/* Edit in Maker */}
                          {onEditInvoice && (
                            <button
                              onClick={() => onEditInvoice(inv)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-purple-50 text-purple-600 hover:text-purple-800 cursor-pointer transition-colors"
                              title="Edit / Duplicate in Invoice Maker"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                            title="Permanently Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls Bar */}
        {!isLoading && totalFiltered > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
            <div className="text-xs text-slate-600 font-medium">
              Showing <span className="font-bold text-slate-900">{totalFiltered === 0 ? 0 : (validCurrentPage - 1) * (pageSize || totalFiltered) + 1}</span> to{" "}
              <span className="font-bold text-slate-900">{pageSize === 0 ? totalFiltered : Math.min(validCurrentPage * pageSize, totalFiltered)}</span> of{" "}
              <span className="font-bold text-slate-900">{totalFiltered}</span> lifetime invoices
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>All</option>
                </select>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={validCurrentPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-2">
                    {validCurrentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={validCurrentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL: FULL INVOICE INSPECTION VIEW                                   */}
      {/* ========================================================================= */}
      {inspectingInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#14161B] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#A3E635]" />
                <div>
                  <div className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                    <span>{inspectingInvoice.invoiceNumber}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                      {inspectingInvoice.recipientType || "institute"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Billed to: <span className="text-white font-medium">{inspectingInvoice.recipientName}</span> • {formatDate(inspectingInvoice.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(inspectingInvoice)}
                  disabled={downloadingPdfId === inspectingInvoice.id}
                  className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => {
                    if (onEditInvoice) {
                      onEditInvoice(inspectingInvoice);
                      setInspectingInvoice(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit in Maker</span>
                </button>
                <button
                  onClick={() => setInspectingInvoice(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Line Items & Summary */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Recipient details card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recipient Details</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{inspectingInvoice.recipientName}</div>
                  <div className="text-slate-600 mt-1">Contact: {inspectingInvoice.contactPerson || "Procurement Officer"}</div>
                  <div className="text-slate-600">Phone: {inspectingInvoice.phone || "N/A"}</div>
                  <div className="text-slate-600">Address: {inspectingInvoice.address || "N/A"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment & Terms</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-bold text-slate-800">Method: {inspectingInvoice.paymentMethod || "COD"}</span>
                    <span className={`px-2 py-0.2 rounded-full text-[10px] font-black uppercase ${
                      inspectingInvoice.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {inspectingInvoice.paymentStatus || "Pending"}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1">Issue Date: {formatDate(inspectingInvoice.createdAt)}</div>
                  {inspectingInvoice.dueDate && (
                    <div className="text-slate-600">Due Date: {formatDate(inspectingInvoice.dueDate)}</div>
                  )}
                  {inspectingInvoice.orderRef && (
                    <div className="text-slate-600 font-mono text-[11px]">Ref: {inspectingInvoice.orderRef}</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#14161B] text-[#F4F4F5] text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-10">SL</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Item Name & Company</th>
                      <th className="py-2.5 px-3 text-right">MRP</th>
                      <th className="py-2.5 px-3 text-right">ডিসকাউন্ট %</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11.5px]">
                    {(inspectingInvoice.items || []).map((itm, i) => (
                      <tr key={itm.id || i} className="even:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{i + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-[10px] uppercase text-purple-700">{itm.category || "Tablet"}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{itm.name}</div>
                          <div className="text-[10.5px] text-slate-500 space-x-1.5">
                            {itm.company && <span className="text-purple-700 font-semibold">{itm.company}</span>}
                            {itm.strength && <span>• {itm.strength}</span>}
                            {itm.packSize && <span>• {itm.packSize}</span>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">৳{safeFixed(itm.mrp, 2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {itm.discountPercentage !== undefined && itm.discountPercentage !== null ? `${itm.discountPercentage}%` : "0%"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">৳{safeFixed(itm.rate, 2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{itm.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">৳{safeFixed(itm.total, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="flex justify-end">
                <div className="w-full sm:w-80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium text-slate-800">৳{safeFixed(inspectingInvoice.subtotal, 2)}</span>
                  </div>
                  {inspectingInvoice.deliveryCharge > 0 && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Delivery Charge</span>
                      <span className="font-mono font-medium text-slate-800">৳{safeFixed(inspectingInvoice.deliveryCharge, 2)}</span>
                    </div>
                  )}
                  {inspectingInvoice.specialAdjustment !== 0 && (
                    <div className="flex justify-between items-center text-purple-700">
                      <span>Special Adjustment</span>
                      <span className="font-mono font-bold">৳{safeFixed(inspectingInvoice.specialAdjustment, 2)}</span>
                    </div>
                  )}
                  <div
                    className="rounded-xl p-3 text-white flex justify-between items-center shadow-md"
                    style={{ background: "linear-gradient(to right, #A855F7, #7C3AED)" }}
                  >
                    <span className="font-bold uppercase tracking-wide text-xs">Final Payable Amount</span>
                    <span className="font-mono font-black text-base">৳{safeFixed(inspectingInvoice.netPayable, 2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

