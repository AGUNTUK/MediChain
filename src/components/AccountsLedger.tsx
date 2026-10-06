import React, { useState, useEffect, useMemo } from "react";
import {
  DailyLedgerSummary,
  AccountsOverviewData,
  Purchase,
  CustomerCollection,
  BusinessExpense,
  CapitalTransaction,
  CustomerReceivableItem,
  SupplierPayableItem,
  ReconciliationReport,
  ExpenseCategory,
  Pharmacy,
  Product
} from "../types";
import { accountsClient } from "../services";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Truck,
  Receipt,
  PieChart,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Filter,
  RefreshCw,
  Search,
  X,
  FileText,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  ShieldAlert,
  Wallet,
  Coins,
  PackageCheck,
  AlertCircle,
  Edit2,
  Save,
  RotateCcw,
  Check,
  Pencil,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  Info,
  Landmark
} from "lucide-react";
import CapitalPartners from "./CapitalPartners";

interface AccountsLedgerProps {
  pharmacies?: Pharmacy[];
  products?: Product[];
}

export default function AccountsLedger({ pharmacies = [], products = [] }: AccountsLedgerProps) {
  // Navigation Subtabs
  const [subTab, setSubTab] = useState<
    | "overview"
    | "daily-ledger"
    | "sales-delivery"
    | "purchases"
    | "collections"
    | "expenses"
    | "profit-loss"
    | "cash-flow"
    | "capital-partners"
    | "inventory-value"
    | "reconciliation"
  >("daily-ledger");

  // Date Filtering (Default Today in Asia/Dhaka)
  const getTodayBd = () => {
    const d = new Date();
    const bd = new Date(d.getTime() + 6 * 3600 * 1000);
    return bd.toISOString().slice(0, 10);
  };

  const formatBDRangeLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
      return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
    } catch {
      return dateStr;
    }
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayBd());
  const [dateRangePreset, setDateRangePreset] = useState<"today" | "yesterday" | "this-week" | "this-month" | "last-month" | "custom">("today");
  const [startDate, setStartDate] = useState<string>(getTodayBd());
  const [endDate, setEndDate] = useState<string>(getTodayBd());

  // Data States
  const [overview, setOverview] = useState<AccountsOverviewData | null>(null);
  const [dailySummary, setDailySummary] = useState<DailyLedgerSummary | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyLedgerSummary[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [collections, setCollections] = useState<CustomerCollection[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [capital, setCapital] = useState<CapitalTransaction[]>([]);
  const [inventoryValuation, setInventoryValuation] = useState<any>(null);
  const [receivables, setReceivables] = useState<CustomerReceivableItem[]>([]);
  const [payables, setPayables] = useState<SupplierPayableItem[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Modals state
  const [showPurchaseModal, setShowPurchaseModal] = useState<boolean>(false);
  const [showCollectionModal, setShowCollectionModal] = useState<boolean>(false);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [showCapitalModal, setShowCapitalModal] = useState<boolean>(false);
  const [showVoidModal, setShowVoidModal] = useState<{ id: string; type: "purchase" | "collection" | "expense" | "capital"; title: string } | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");

  // Daily Ledger Inline Editing State
  const [editingRowDate, setEditingRowDate] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    purchases: number;
    deliveredSales: number;
    deliveryChargeCollected: number;
    customerCollections: number;
    cogs: number;
    transportExpenses: number;
    deliveryExpenses: number;
    otherExpenses: number;
    cashIn: number;
    cashOut: number;
    notes: string;
  }>({
    purchases: 0,
    deliveredSales: 0,
    deliveryChargeCollected: 0,
    customerCollections: 0,
    cogs: 0,
    transportExpenses: 0,
    deliveryExpenses: 0,
    otherExpenses: 0,
    cashIn: 0,
    cashOut: 0,
    notes: ""
  });
  const [isSavingRow, setIsSavingRow] = useState<boolean>(false);

  // Dedicated Day Ledger Edit Modal State
  const [showEditDayModal, setShowEditDayModal] = useState<DailyLedgerSummary | null>(null);
  const [modalEditFormData, setModalEditFormData] = useState<{
    purchases: number;
    deliveredSales: number;
    deliveryChargeCollected: number;
    customerCollections: number;
    cogs: number;
    transportExpenses: number;
    deliveryExpenses: number;
    otherExpenses: number;
    cashIn: number;
    cashOut: number;
    notes: string;
  }>({
    purchases: 0,
    deliveredSales: 0,
    deliveryChargeCollected: 0,
    customerCollections: 0,
    cogs: 0,
    transportExpenses: 0,
    deliveryExpenses: 0,
    otherExpenses: 0,
    cashIn: 0,
    cashOut: 0,
    notes: ""
  });

  // Quick preset dates changer
  const handlePresetChange = (preset: typeof dateRangePreset) => {
    setDateRangePreset(preset);
    const today = new Date();
    const bdNow = new Date(today.getTime() + 6 * 3600 * 1000);
    const todayStr = bdNow.toISOString().slice(0, 10);

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setSelectedDate(todayStr);
    } else if (preset === "yesterday") {
      const yest = new Date(bdNow);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().slice(0, 10);
      setStartDate(yestStr);
      setEndDate(yestStr);
      setSelectedDate(yestStr);
    } else if (preset === "this-week") {
      const dayOfWeek = bdNow.getUTCDay(); // 0 = Sun
      const firstDay = new Date(bdNow);
      firstDay.setDate(firstDay.getDate() - dayOfWeek);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "this-month") {
      const firstDay = `${todayStr.slice(0, 7)}-01`;
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === "last-month") {
      const lastMonth = new Date(bdNow.getFullYear(), bdNow.getMonth() - 1, 1);
      const lastMonthEnd = new Date(bdNow.getFullYear(), bdNow.getMonth(), 0);
      setStartDate(lastMonth.toISOString().slice(0, 10));
      setEndDate(lastMonthEnd.toISOString().slice(0, 10));
    }
  };

  // Day step
  const handleDayStep = (offset: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + offset);
    const newDateStr = cur.toISOString().slice(0, 10);
    setSelectedDate(newDateStr);
    setStartDate(newDateStr);
    setEndDate(newDateStr);
    setDateRangePreset("custom");
  };

  // Toast feedback
  const showToast = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  // Load all accounts data
  const loadAccountsData = async () => {
    setLoading(true);
    try {
      const [
        overviewData,
        ledgerData,
        purchasesList,
        collectionsList,
        expensesList,
        capitalList,
        invData,
        recList,
        payList,
        reconData
      ] = await Promise.all([
        accountsClient.getOverview(startDate, endDate).catch(() => null),
        accountsClient.getDailyLedger({ startDate, endDate }).catch(() => ({ summary: null as any, dailyRows: [] })),
        accountsClient.getPurchases({ startDate, endDate }).catch(() => []),
        accountsClient.getCollections({ startDate, endDate }).catch(() => []),
        accountsClient.getExpenses({ startDate, endDate }).catch(() => []),
        accountsClient.getCapital({ startDate, endDate }).catch(() => []),
        accountsClient.getInventoryValuation().catch(() => null),
        accountsClient.getReceivables().catch(() => []),
        accountsClient.getPayables().catch(() => []),
        accountsClient.getReconciliation().catch(() => null)
      ]);

      if (overviewData) setOverview(overviewData);
      if (ledgerData?.summary) setDailySummary(ledgerData.summary);
      if (ledgerData?.dailyRows) setDailyRows(ledgerData.dailyRows);
      setPurchases(purchasesList);
      setCollections(collectionsList);
      setExpenses(expensesList);
      setCapital(capitalList);
      if (invData) setInventoryValuation(invData);
      setReceivables(recList);
      setPayables(payList);
      if (reconData) setReconciliation(reconData);
    } catch (err: any) {
      console.error("[Accounts] Failed to load data:", err);
      showToast("Error loading financial ledger data", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountsData();
  }, [startDate, endDate, selectedDate]);

  // Export CSV
  const handleExportCsv = (type: string) => {
    const url = `/api/admin/accounts/export?type=${type}&startDate=${startDate}&endDate=${endDate}`;
    window.open(url, "_blank");
  };

  // Void confirmation handler
  const handleConfirmVoid = async () => {
    if (!showVoidModal || !voidReason.trim()) {
      showToast("Please provide a reason for voiding this entry.", true);
      return;
    }
    const { id, type } = showVoidModal;
    try {
      if (type === "purchase") await accountsClient.voidPurchase(id, voidReason);
      else if (type === "collection") await accountsClient.voidCollection(id, voidReason);
      else if (type === "expense") await accountsClient.voidExpense(id, voidReason);
      else if (type === "capital") await accountsClient.voidCapital(id, voidReason);

      showToast(`Successfully voided ${type} entry.`);
      setShowVoidModal(null);
      setVoidReason("");
      loadAccountsData();
    } catch (err: any) {
      showToast(err.message || "Failed to void transaction", true);
    }
  };

  // --- DAILY LEDGER ROW EDITING HANDLERS ---
  const handleStartInlineEdit = (row: DailyLedgerSummary) => {
    setEditingRowDate(row.date);
    setEditFormData({
      purchases: row.purchases,
      deliveredSales: row.deliveredSales,
      deliveryChargeCollected: row.deliveryChargeCollected || 0,
      customerCollections: row.customerCollections,
      cogs: row.cogs,
      transportExpenses: row.transportExpenses || 0,
      deliveryExpenses: row.deliveryExpenses || 0,
      otherExpenses: row.otherExpenses || 0,
      cashIn: row.cashIn,
      cashOut: row.cashOut,
      notes: row.overrideNotes || ""
    });
  };

  const handleCancelInlineEdit = () => {
    setEditingRowDate(null);
  };

  const handleSaveInlineEdit = async (date: string) => {
    setIsSavingRow(true);
    try {
      await accountsClient.updateDailyLedgerRow(date, {
        purchases: Number(editFormData.purchases) || 0,
        deliveredSales: Number(editFormData.deliveredSales) || 0,
        deliveryChargeCollected: Number(editFormData.deliveryChargeCollected) || 0,
        customerCollections: Number(editFormData.customerCollections) || 0,
        cogs: Number(editFormData.cogs) || 0,
        transportExpenses: Number(editFormData.transportExpenses) || 0,
        deliveryExpenses: Number(editFormData.deliveryExpenses) || 0,
        otherExpenses: Number(editFormData.otherExpenses) || 0,
        cashIn: Number(editFormData.cashIn) || 0,
        cashOut: Number(editFormData.cashOut) || 0,
        notes: editFormData.notes
      });
      showToast(`Daily ledger for ${date} updated and saved successfully.`);
      setEditingRowDate(null);
      await loadAccountsData();
    } catch (err: any) {
      showToast(err.message || "Failed to update daily ledger row", true);
    } finally {
      setIsSavingRow(false);
    }
  };

  const handleResetRowOverride = async (date: string) => {
    if (!confirm(`Are you sure you want to revert manual overrides for ${date} and restore auto-calculated order values?`)) return;
    setIsSavingRow(true);
    try {
      await accountsClient.resetDailyLedgerRow(date);
      showToast(`Manual overrides removed. ${date} restored to auto-calculated transactional values.`);
      if (editingRowDate === date) setEditingRowDate(null);
      if (showEditDayModal?.date === date) setShowEditDayModal(null);
      await loadAccountsData();
    } catch (err: any) {
      showToast(err.message || "Failed to reset daily ledger row", true);
    } finally {
      setIsSavingRow(false);
    }
  };

  const handleOpenEditModal = (row: DailyLedgerSummary) => {
    setShowEditDayModal(row);
    setModalEditFormData({
      purchases: row.purchases,
      deliveredSales: row.deliveredSales,
      deliveryChargeCollected: row.deliveryChargeCollected || 0,
      customerCollections: row.customerCollections,
      cogs: row.cogs,
      transportExpenses: row.transportExpenses || 0,
      deliveryExpenses: row.deliveryExpenses || 0,
      otherExpenses: row.otherExpenses || 0,
      cashIn: row.cashIn,
      cashOut: row.cashOut,
      notes: row.overrideNotes || ""
    });
  };

  const handleSaveModalEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditDayModal) return;
    setIsSavingRow(true);
    try {
      await accountsClient.updateDailyLedgerRow(showEditDayModal.date, {
        purchases: Number(modalEditFormData.purchases) || 0,
        deliveredSales: Number(modalEditFormData.deliveredSales) || 0,
        deliveryChargeCollected: Number(modalEditFormData.deliveryChargeCollected) || 0,
        customerCollections: Number(modalEditFormData.customerCollections) || 0,
        cogs: Number(modalEditFormData.cogs) || 0,
        transportExpenses: Number(modalEditFormData.transportExpenses) || 0,
        deliveryExpenses: Number(modalEditFormData.deliveryExpenses) || 0,
        otherExpenses: Number(modalEditFormData.otherExpenses) || 0,
        cashIn: Number(modalEditFormData.cashIn) || 0,
        cashOut: Number(modalEditFormData.cashOut) || 0,
        notes: modalEditFormData.notes
      });
      showToast(`Daily ledger for ${showEditDayModal.date} updated successfully.`);
      setShowEditDayModal(null);
      await loadAccountsData();
    } catch (err: any) {
      showToast(err.message || "Failed to save daily ledger changes", true);
    } finally {
      setIsSavingRow(false);
    }
  };

  // Helper format currency
  const formatTaka = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return "৳0.00";
    return `৳${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-12">
      {/* Toast notifications */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-slide-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-slide-in">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TOP HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Unified Accounts & Business Ledger
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                  Internal Finance
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative double-entry ledger tracking purchases, sales, collections, real COGS, operating costs, and profit.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Purchase</span>
          </button>
          <button
            onClick={() => setShowCollectionModal(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Collection</span>
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Expense</span>
          </button>
          <button
            onClick={() => setShowCapitalModal(true)}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Capital In/Out</span>
          </button>
          <button
            onClick={loadAccountsData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="Refresh Ledger Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* DATE CONTROLS & RANGE SELECTOR */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Preset selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "this-week", label: "This Week" },
            { id: "this-month", label: "This Month" },
            { id: "last-month", label: "Last Month" }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                dateRangePreset === p.id
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Stepper and Range inputs */}
        <div className="flex flex-wrap items-center gap-2">
          {dateRangePreset === "today" || dateRangePreset === "yesterday" || startDate === endDate ? (
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => handleDayStep(-1)}
                className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-all cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-900 tracking-wide">
                {selectedDate} (Asia/Dhaka)
              </span>
              <button
                onClick={() => handleDayStep(1)}
                className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-all cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDateRangePreset("custom");
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDateRangePreset("custom");
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>
          )}

          <button
            onClick={() => handleExportCsv(subTab === "purchases" ? "purchases" : subTab === "collections" ? "collections" : subTab === "expenses" ? "expenses" : "daily-ledger")}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* SUBTABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold no-scrollbar">
        {[
          { id: "daily-ledger", label: "Daily Ledger", icon: Receipt },
          { id: "overview", label: "Business Health", icon: PieChart },
          { id: "sales-delivery", label: "Sales & Delivery", icon: ShoppingBag },
          { id: "purchases", label: "Purchases", icon: PackageCheck },
          { id: "collections", label: "Collections", icon: DollarSign },
          { id: "expenses", label: "Expenses", icon: CreditCard },
          { id: "profit-loss", label: "Profit & Loss", icon: TrendingUp },
          { id: "cash-flow", label: "Cash Flow", icon: Wallet },
          { id: "capital-partners", label: "Capital & Partners", icon: Landmark },
          { id: "inventory-value", label: "Inventory Value", icon: Layers },
          { id: "reconciliation", label: "Reconciliation", icon: CheckCircle2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-xl whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white/60 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MISSING BUYING PRICE ALERT BANNER */}
      {dailySummary?.hasIncompleteCost && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Financial Alert: Incomplete Buying Price Detected</p>
            <p className="text-amber-800">
              One or more products sold in this period do not have an acquisition buying price configured. COGS and profit for those items are omitted rather than fabricated. Configure buying prices in Medicine Master Registry to finalize margins.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DAILY LEDGER TAB (PRIMARY ACCOUNTING SCREEN) */}
      {/* ========================================================================= */}
      {subTab === "daily-ledger" && (
        <div className="space-y-6">
          {/* DAILY SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* 1. Product Purchase */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Product Purchase</span>
                <PackageCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900">
                {formatTaka(dailySummary?.purchases)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Recorded supplier purchases</p>
            </div>

            {/* 2. Delivered Sales */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Delivered Sales</span>
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-indigo-950">
                {formatTaka(dailySummary?.deliveredSales)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Delivered / realized revenue</p>
            </div>

            {/* 3. Delivery Charge Income (+) */}
            <div className="bg-white border border-emerald-200/80 bg-emerald-50/20 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-[11px] font-bold uppercase tracking-wider">Delivery Charge (+)</span>
                <Truck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-950">
                +{formatTaka(dailySummary?.deliveryChargeCollected)}
              </div>
              <p className="text-[10px] text-emerald-700 font-medium">৳40 per invoice earned</p>
            </div>

            {/* 4. Customer Collection */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Customer Collection</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-blue-950">
                {formatTaka(dailySummary?.customerCollections)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Actual cash received</p>
            </div>

            {/* 5. Customer Outstanding */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Customer Due</span>
                <Coins className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-950">
                {formatTaka(dailySummary?.customerOutstanding)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Sales minus collections</p>
            </div>

            {/* 6. COGS */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">COGS (Cost)</span>
                <Layers className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900">
                {formatTaka(dailySummary?.cogs)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Acquisition cost of sold goods</p>
            </div>

            {/* 7. Gross Profit */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Gross Profit</span>
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-teal-950">
                {formatTaka(dailySummary?.grossProfit)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Sales - COGS + Delivery Charge</p>
            </div>

            {/* 8. Wholesaler Transport Cost (-) */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Transport Cost (-)</span>
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-950">
                {formatTaka(dailySummary?.transportExpenses)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Wholesaler transit / procurement</p>
            </div>

            {/* 9. Other Expenses (-) */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Other Expenses (-)</span>
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900">
                {formatTaka(dailySummary?.otherExpenses)}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Overheads, salary, packaging</p>
            </div>

            {/* 10. NET PROFIT */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-md space-y-1 border border-indigo-800">
              <div className="flex items-center justify-between text-indigo-200">
                <span className="text-[11px] font-black uppercase tracking-wider">NET PROFIT</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-300">
                {formatTaka(dailySummary?.netProfit)}
              </div>
              <p className="text-[10px] text-slate-300 font-medium truncate">
                Gross Profit - Transport - Other Exp
              </p>
            </div>
          </div>

          {/* DATE-WISE LEDGER TABLE (FULLY EDITABLE) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Daily Business Ledger Table</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Fully Editable
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click the <strong className="text-slate-700">Edit (Pencil)</strong> icon on any day to modify purchases, sales, delivery charge, COGS, wholesaler transport, or expenses with live instant math recalculation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const rowToEdit = dailyRows.find(r => r.date === selectedDate) || dailySummary || {
                      date: selectedDate,
                      formattedDate: formatBDRangeLabel(selectedDate),
                      purchases: 0,
                      deliveredSales: 0,
                      deliveryChargeCollected: 0,
                      customerCollections: 0,
                      customerOutstanding: 0,
                      cogs: 0,
                      grossProfit: 0,
                      transportExpenses: 0,
                      deliveryExpenses: 0,
                      otherExpenses: 0,
                      netProfit: 0,
                      cashIn: 0,
                      cashOut: 0,
                      netCashFlow: 0,
                      capitalContributions: 0,
                      capitalWithdrawals: 0,
                      ordersCount: 0,
                      invoicesCount: 0,
                      hasIncompleteCost: false
                    };
                    handleOpenEditModal(rowToEdit);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adjust Day Entry</span>
                </button>

                <button
                  onClick={() => handleExportCsv("daily-ledger")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Export Daily Ledger as CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {dailyRows.length} Days
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Purchases</th>
                    <th className="py-3 px-3">Delivered Sales</th>
                    <th className="py-3 px-3 text-emerald-800">Delivery (+)</th>
                    <th className="py-3 px-3">Collection</th>
                    <th className="py-3 px-3">COGS</th>
                    <th className="py-3 px-3 text-teal-800">Gross Profit</th>
                    <th className="py-3 px-3 text-amber-800">Transport (-)</th>
                    <th className="py-3 px-3">Other Exp (-)</th>
                    <th className="py-3 px-3 font-black text-slate-900">Net Profit</th>
                    <th className="py-3 px-3">Cash In</th>
                    <th className="py-3 px-3">Cash Out</th>
                    <th className="py-3 px-3">Net Cash</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {dailyRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-8 text-center text-slate-400">
                        No financial activity found for selected date range.
                      </td>
                    </tr>
                  ) : (
                    dailyRows.map((row, idx) => {
                      const isEditing = editingRowDate === row.date;

                      // Live computed fields during inline editing
                      const liveSales = isEditing ? (Number(editFormData.deliveredSales) || 0) : row.deliveredSales;
                      const liveDeliveryCharge = isEditing ? (Number(editFormData.deliveryChargeCollected) || 0) : (row.deliveryChargeCollected || 0);
                      const liveCogs = isEditing ? (Number(editFormData.cogs) || 0) : row.cogs;
                      // Gross Profit = (Delivered Sales - COGS) + Delivery Charge Collected
                      const liveGrossProfit = Math.round(((liveSales - liveCogs) + liveDeliveryCharge) * 100) / 100;
                      const liveTransport = isEditing ? (Number(editFormData.transportExpenses) || 0) : (row.transportExpenses || 0);
                      const liveDelivery = isEditing ? (Number(editFormData.deliveryExpenses) || 0) : (row.deliveryExpenses || 0);
                      const liveOtherExp = isEditing ? (Number(editFormData.otherExpenses) || 0) : row.otherExpenses;
                      // Net Profit = Gross Profit - Transport - Delivery - Other Expenses
                      const liveNetProfit = Math.round((liveGrossProfit - liveTransport - liveDelivery - liveOtherExp) * 100) / 100;
                      const liveCashIn = isEditing ? (Number(editFormData.cashIn) || 0) : row.cashIn;
                      const liveCashOut = isEditing ? (Number(editFormData.cashOut) || 0) : row.cashOut;
                      const liveNetCashFlow = Math.round((liveCashIn - liveCashOut) * 100) / 100;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isEditing
                              ? "bg-amber-50/70 border-2 border-amber-300"
                              : row.isOverridden
                              ? "bg-amber-50/20 hover:bg-amber-50/40"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          {/* 1. Date & Override Badge */}
                          <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div>{row.date}</div>
                              {row.isOverridden && (
                                <div className="flex items-center gap-1">
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Manual Override
                                  </span>
                                </div>
                              )}
                              {row.overrideNotes && (
                                <p className="text-[9px] text-slate-400 font-normal italic max-w-[110px] truncate" title={row.overrideNotes}>
                                  {row.overrideNotes}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* 2. Purchases */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editFormData.purchases}
                                onChange={e => setEditFormData({ ...editFormData, purchases: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-1.5 py-1 text-xs border border-amber-400 bg-white rounded font-mono font-bold text-emerald-800 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span
                                className={`font-semibold text-emerald-700 ${row.rawCalculated && row.rawCalculated.purchases !== row.purchases ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                                title={row.rawCalculated && row.rawCalculated.purchases !== row.purchases ? `Manual Override. Auto: ${formatTaka(row.rawCalculated.purchases)}` : undefined}
                              >
                                {formatTaka(row.purchases)}
                              </span>
                            )}
                          </td>

                          {/* 3. Delivered Sales */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editFormData.deliveredSales}
                                onChange={e => setEditFormData({ ...editFormData, deliveredSales: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-1.5 py-1 text-xs border border-amber-400 bg-white rounded font-mono font-bold text-indigo-900 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span
                                className={`font-bold text-indigo-900 ${row.rawCalculated && row.rawCalculated.deliveredSales !== row.deliveredSales ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                                title={row.rawCalculated && row.rawCalculated.deliveredSales !== row.deliveredSales ? `Manual Override. Auto: ${formatTaka(row.rawCalculated.deliveredSales)}` : undefined}
                              >
                                {formatTaka(row.deliveredSales)}
                              </span>
                            )}
                          </td>

                          {/* 4. Delivery Charge Collected (+) */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editFormData.deliveryChargeCollected}
                                onChange={e => setEditFormData({ ...editFormData, deliveryChargeCollected: parseFloat(e.target.value) || 0 })}
                                className="w-16 px-1.5 py-1 text-xs border border-emerald-400 bg-emerald-50 rounded font-mono font-bold text-emerald-800 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            ) : (
                              <span
                                className={`font-bold text-emerald-700 ${row.rawCalculated && row.rawCalculated.deliveryChargeCollected !== row.deliveryChargeCollected ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                                title={row.rawCalculated && row.rawCalculated.deliveryChargeCollected !== row.deliveryChargeCollected ? `Manual Override. Auto: +${formatTaka(row.rawCalculated.deliveryChargeCollected)}` : undefined}
                              >
                                +{formatTaka(row.deliveryChargeCollected)}
                              </span>
                            )}
                          </td>

                          {/* 5. Collections */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editFormData.customerCollections}
                                onChange={e => setEditFormData({ ...editFormData, customerCollections: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-1.5 py-1 text-xs border border-amber-400 bg-white rounded font-mono font-bold text-blue-800 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span
                                className={`font-semibold text-blue-700 ${row.rawCalculated && row.rawCalculated.customerCollections !== row.customerCollections ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                                title={row.rawCalculated && row.rawCalculated.customerCollections !== row.customerCollections ? `Manual Override. Auto: ${formatTaka(row.rawCalculated.customerCollections)}` : undefined}
                              >
                                {formatTaka(row.customerCollections)}
                              </span>
                            )}
                          </td>

                          {/* 6. COGS */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editFormData.cogs}
                                onChange={e => setEditFormData({ ...editFormData, cogs: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-1.5 py-1 text-xs border border-amber-400 bg-white rounded font-mono font-semibold text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span
                                className={`font-semibold text-slate-800 ${row.rawCalculated && row.rawCalculated.cogs !== row.cogs ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                                title={row.rawCalculated && row.rawCalculated.cogs !== row.cogs ? `Manual Override. Auto: ${formatTaka(row.rawCalculated.cogs)}` : undefined}
                              >
                                {formatTaka(row.cogs)}
                              </span>
                            )}
                          </td>

                          {/* 7. Gross Profit (Sales - COGS + Delivery Charge) */}
                          <td className="py-3 px-3">
                            <span
                              className={`font-bold text-teal-700 ${row.rawCalculated && row.rawCalculated.grossProfit !== row.grossProfit ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                              title={row.rawCalculated && row.rawCalculated.grossProfit !== row.grossProfit ? `Effective GP. Auto: ${formatTaka(row.rawCalculated.grossProfit)}` : undefined}
                            >
                              {formatTaka(liveGrossProfit)}
                            </span>
                          </td>

                          {/* 8. Wholesaler Transport Expenses (-) */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editFormData.transportExpenses}
                                onChange={e => setEditFormData({ ...editFormData, transportExpenses: parseFloat(e.target.value) || 0 })}
                                className="w-18 px-1.5 py-1 text-xs border border-amber-400 bg-white rounded font-mono font-medium text-amber-800 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span
                                className={`text-amber-700 font-medium ${row.rawCalculated && row.rawCalculated.transportExpenses !== row.transportExpenses ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                                title={row.rawCalculated && row.rawCalculated.transportExpenses !== row.transportExpenses ? `Manual Override. Auto: ${formatTaka(row.rawCalculated.transportExpenses)}` : undefined}
                              >
                                {formatTaka(row.transportExpenses)}
                              </span>
                            )}
                          </td>

                          {/* 9. Other Expenses (-) */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editFormData.otherExpenses}
                                onChange={e => setEditFormData({ ...editFormData, otherExpenses: parseFloat(e.target.value) || 0 })}
                                className="w-18 px-1.5 py-1 text-xs border border-amber-400 bg-white rounded font-mono font-medium text-purple-800 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span
                                className={`text-purple-700 ${row.rawCalculated && row.rawCalculated.otherExpenses !== row.otherExpenses ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                                title={row.rawCalculated && row.rawCalculated.otherExpenses !== row.otherExpenses ? `Manual Override. Auto: ${formatTaka(row.rawCalculated.otherExpenses)}` : undefined}
                              >
                                {formatTaka(row.otherExpenses)}
                              </span>
                            )}
                          </td>

                          {/* 10. Net Profit (Auto-recalculated) */}
                          <td className={`py-3 px-3 font-black ${liveNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            <span
                              className={row.rawCalculated && row.rawCalculated.netProfit !== row.netProfit ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}
                              title={row.rawCalculated && row.rawCalculated.netProfit !== row.netProfit ? `Effective Net Profit. Auto: ${formatTaka(row.rawCalculated.netProfit)}` : undefined}
                            >
                              {formatTaka(liveNetProfit)}
                            </span>
                          </td>

                          {/* 11. Cash In */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editFormData.cashIn}
                                onChange={e => setEditFormData({ ...editFormData, cashIn: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-1.5 py-1 text-xs border border-amber-400 bg-white rounded font-mono font-medium text-blue-700 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span
                                className={`text-blue-600 ${row.rawCalculated && row.rawCalculated.cashIn !== row.cashIn ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                                title={row.rawCalculated && row.rawCalculated.cashIn !== row.cashIn ? `Manual Override. Auto: +${formatTaka(row.rawCalculated.cashIn)}` : undefined}
                              >
                                +{formatTaka(row.cashIn)}
                              </span>
                            )}
                          </td>

                          {/* 12. Cash Out */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editFormData.cashOut}
                                onChange={e => setEditFormData({ ...editFormData, cashOut: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-1.5 py-1 text-xs border border-amber-400 bg-white rounded font-mono font-medium text-rose-700 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span
                                className={`text-rose-600 ${row.rawCalculated && row.rawCalculated.cashOut !== row.cashOut ? "underline decoration-amber-400 decoration-dotted cursor-help" : ""}`}
                                title={row.rawCalculated && row.rawCalculated.cashOut !== row.cashOut ? `Manual Override. Auto: -${formatTaka(row.rawCalculated.cashOut)}` : undefined}
                              >
                                -{formatTaka(row.cashOut)}
                              </span>
                            )}
                          </td>

                          {/* 13. Net Cash Flow (Auto-recalculated) */}
                          <td className={`py-3 px-3 font-bold ${liveNetCashFlow >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {liveNetCashFlow >= 0 ? "+" : ""}{formatTaka(liveNetCashFlow)}
                          </td>

                          {/* 14. Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleSaveInlineEdit(row.date)}
                                  disabled={isSavingRow}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
                                  title="Save Row Edits"
                                >
                                  {isSavingRow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={handleCancelInlineEdit}
                                  disabled={isSavingRow}
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                  title="Cancel Editing"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(row)}
                                  className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors cursor-pointer"
                                  title="Add Notes & Audit Memo"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleStartInlineEdit(row)}
                                  className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                  title="Inline Edit Day Values"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(row)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                  title="Open Comprehensive Edit Modal"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </button>
                                {row.isOverridden && (
                                  <button
                                    onClick={() => handleResetRowOverride(row.date)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Revert Overrides to Auto-Calculated Values"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {dailyRows.length > 0 && (
                  <tfoot className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-[11px] text-slate-800">
                    {(() => {
                      const totalPurchases = dailyRows.reduce((s, r) => s + r.purchases, 0);
                      const totalSales = dailyRows.reduce((s, r) => s + r.deliveredSales, 0);
                      const totalDelivery = dailyRows.reduce((s, r) => s + (r.deliveryChargeCollected || 0), 0);
                      const totalCollections = dailyRows.reduce((s, r) => s + r.customerCollections, 0);
                      const totalCogs = dailyRows.reduce((s, r) => s + r.cogs, 0);
                      const totalGrossProfit = dailyRows.reduce((s, r) => s + r.grossProfit, 0);
                      const totalTransport = dailyRows.reduce((s, r) => s + (r.transportExpenses || 0), 0);
                      const totalOtherExp = dailyRows.reduce((s, r) => s + r.otherExpenses, 0);
                      const totalNetProfit = dailyRows.reduce((s, r) => s + r.netProfit, 0);
                      const totalCashIn = dailyRows.reduce((s, r) => s + r.cashIn, 0);
                      const totalCashOut = dailyRows.reduce((s, r) => s + r.cashOut, 0);
                      const totalNetCashFlow = dailyRows.reduce((s, r) => s + r.netCashFlow, 0);

                      return (
                        <tr>
                          <td className="py-3 px-3 uppercase tracking-wider font-black text-slate-900">Total ({dailyRows.length}d)</td>
                          <td className="py-3 px-3 text-emerald-800">{formatTaka(totalPurchases)}</td>
                          <td className="py-3 px-3 text-indigo-950 font-black">{formatTaka(totalSales)}</td>
                          <td className="py-3 px-3 text-emerald-800">+{formatTaka(totalDelivery)}</td>
                          <td className="py-3 px-3 text-blue-800">{formatTaka(totalCollections)}</td>
                          <td className="py-3 px-3 text-slate-800">{formatTaka(totalCogs)}</td>
                          <td className="py-3 px-3 text-teal-800 font-black">{formatTaka(totalGrossProfit)}</td>
                          <td className="py-3 px-3 text-amber-900 font-bold">-{formatTaka(totalTransport)}</td>
                          <td className="py-3 px-3 text-purple-900">-{formatTaka(totalOtherExp)}</td>
                          <td className={`py-3 px-3 font-black text-xs ${totalNetProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {formatTaka(totalNetProfit)}
                          </td>
                          <td className="py-3 px-3 text-blue-700">+{formatTaka(totalCashIn)}</td>
                          <td className="py-3 px-3 text-rose-700">-{formatTaka(totalCashOut)}</td>
                          <td className={`py-3 px-3 font-black ${totalNetCashFlow >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                            {totalNetCashFlow >= 0 ? "+" : ""}{formatTaka(totalNetCashFlow)}
                          </td>
                          <td className="py-3 px-3"></td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BUSINESS HEALTH OVERVIEW */}
      {/* ========================================================================= */}
      {subTab === "overview" && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Customer Receivables</span>
              <div className="text-2xl font-black text-amber-700">{formatTaka(overview.totalReceivables)}</div>
              <p className="text-xs text-slate-400">Total customer credit & pending invoice dues</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Supplier Payables</span>
              <div className="text-2xl font-black text-rose-700">{formatTaka(overview.totalPayables)}</div>
              <p className="text-xs text-slate-400">Total credit purchases owed to suppliers</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Capital Account</span>
              <div className="text-2xl font-black text-indigo-700">{formatTaka(overview.totalCapital)}</div>
              <p className="text-xs text-slate-400">Net equity contributions minus withdrawals</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Inventory Valuation</span>
              <div className="text-2xl font-black text-emerald-700">{formatTaka(overview.currentInventoryValue)}</div>
              <p className="text-xs text-slate-400">Valued at historical buying prices ({overview.missingCostCount} items missing cost)</p>
            </div>
          </div>

          {/* Core P&L Summary Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Period Financial Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 font-bold">Revenue Realized</span>
                <div className="text-xl font-bold text-slate-900">{formatTaka(dailySummary?.deliveredSales)}</div>
                <p className="text-[11px] text-slate-400">From wholesale orders + saved custom invoices</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 font-bold">Gross Margin %</span>
                <div className="text-xl font-bold text-teal-600">
                  {dailySummary && dailySummary.deliveredSales > 0
                    ? `${Math.round(((dailySummary.grossProfit / dailySummary.deliveredSales) * 100) * 10) / 10}%`
                    : "0.0%"}
                </div>
                <p className="text-[11px] text-slate-400">Gross profit divided by revenue</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                <span className="text-xs text-slate-500 font-bold">Net Margin %</span>
                <div className="text-xl font-bold text-emerald-600">
                  {dailySummary && dailySummary.deliveredSales > 0
                    ? `${Math.round(((dailySummary.netProfit / dailySummary.deliveredSales) * 100) * 10) / 10}%`
                    : "0.0%"}
                </div>
                <p className="text-[11px] text-slate-400">Net profit after all delivery and operating costs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PURCHASES TAB */}
      {/* ========================================================================= */}
      {subTab === "purchases" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Procurement & Product Purchases</h3>
              <p className="text-xs text-slate-500">All recorded supplier procurement invoices and payables.</p>
            </div>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Purchase</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-4">Purchase No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Due (Payable)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No purchases recorded for this date range. Click "+ Add Purchase" to add supplier invoices.
                    </td>
                  </tr>
                ) : (
                  purchases.map(p => (
                    <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.status === "Voided" ? "opacity-50 line-through" : ""}`}>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.purchaseNumber}</td>
                      <td className="py-3 px-4">{p.purchaseDate}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.supplierName}</td>
                      <td className="py-3 px-4 text-slate-500">{p.invoiceReference || "—"}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{formatTaka(p.totalAmount)}</td>
                      <td className="py-3 px-4 text-emerald-600 font-semibold">{formatTaka(p.paidAmount)}</td>
                      <td className="py-3 px-4 text-rose-600 font-semibold">{formatTaka(p.dueAmount)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          p.status === "Voided"
                            ? "bg-slate-100 text-slate-600"
                            : p.paymentStatus === "Paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.paymentStatus === "Partially Paid"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {p.status === "Voided" ? "Voided" : p.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.status !== "Voided" && (
                          <button
                            onClick={() => setShowVoidModal({ id: p.id, type: "purchase", title: `Purchase ${p.purchaseNumber}` })}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. COLLECTIONS TAB */}
      {/* ========================================================================= */}
      {subTab === "collections" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Customer Collections Ledger</h3>
              <p className="text-xs text-slate-500">Real money received from pharmacy orders and institutional invoices.</p>
            </div>
            <button
              onClick={() => setShowCollectionModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Collection</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-4">Collection No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer / Pharmacy</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {collections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No collections recorded for this period. Click "+ Add Collection" to record payments.
                    </td>
                  </tr>
                ) : (
                  collections.map(c => (
                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.status === "Voided" ? "opacity-50 line-through" : ""}`}>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.collectionNumber}</td>
                      <td className="py-3 px-4">{c.collectionDate}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{c.customerName}</td>
                      <td className="py-3 px-4 font-black text-blue-700">{formatTaka(c.amount)}</td>
                      <td className="py-3 px-4">{c.paymentMethod}</td>
                      <td className="py-3 px-4 text-slate-500">{c.referenceInvoiceId || "—"}</td>
                      <td className="py-3 px-4 text-slate-500">{c.notes || "—"}</td>
                      <td className="py-3 px-4 text-right">
                        {c.status !== "Voided" && (
                          <button
                            onClick={() => setShowVoidModal({ id: c.id, type: "collection", title: `Collection ${c.collectionNumber}` })}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. EXPENSES TAB */}
      {/* ========================================================================= */}
      {subTab === "expenses" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Operating & Delivery Expenses</h3>
              <p className="text-xs text-slate-500">Business overheads, transport, salaries, packaging, and utilities.</p>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-4">Expense No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No expenses recorded for this period.
                    </td>
                  </tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id} className={`hover:bg-slate-50 transition-colors ${e.status === "Voided" ? "opacity-50 line-through" : ""}`}>
                      <td className="py-3 px-4 font-bold text-slate-900">{e.expenseNumber}</td>
                      <td className="py-3 px-4">{e.expenseDate}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{e.description}</td>
                      <td className="py-3 px-4 font-black text-rose-700">{formatTaka(e.amount)}</td>
                      <td className="py-3 px-4">{e.paymentMethod}</td>
                      <td className="py-3 px-4 text-slate-500">{e.reference || "—"}</td>
                      <td className="py-3 px-4 text-right">
                        {e.status !== "Voided" && (
                          <button
                            onClick={() => setShowVoidModal({ id: e.id, type: "expense", title: `Expense ${e.expenseNumber}` })}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. RECONCILIATION AUDIT TAB */}
      {/* ========================================================================= */}
      {subTab === "reconciliation" && reconciliation && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Automated Ledger Reconciliation
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  reconciliation.overallStatus === "PASS"
                    ? "bg-emerald-100 text-emerald-800"
                    : reconciliation.overallStatus === "WARNING"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}>
                  {reconciliation.overallStatus}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated arithmetic audit cross-verifying Order headers, items, custom invoices, COGS, and collections.
              </p>
            </div>
            <button
              onClick={loadAccountsData}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-check Now</span>
            </button>
          </div>

          <div className="space-y-4">
            {reconciliation.checks.map((chk, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${chk.status === "PASS" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <h4 className="text-xs font-bold text-slate-900">{chk.name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500">{chk.description}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">{chk.sourceA.name}</span>
                    <span className="font-bold text-slate-800">{formatTaka(chk.sourceA.value)}</span>
                  </div>
                  <span className="text-slate-400">vs</span>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">{chk.sourceB.name}</span>
                    <span className="font-bold text-slate-800">{formatTaka(chk.sourceB.value)}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-black ${
                    chk.status === "PASS" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {chk.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. INVENTORY VALUE TAB */}
      {/* ========================================================================= */}
      {subTab === "inventory-value" && inventoryValuation && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inventory Valuation & Buying Cost</h3>
              <p className="text-xs text-slate-500">Stock valued strictly at acquisition/buying cost (never inflated by retail price).</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Asset Value</span>
              <span className="text-lg font-black text-emerald-700">{formatTaka(inventoryValuation.totalInventoryValue)}</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Buying Price</th>
                  <th className="py-3 px-4 text-right">Total Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(inventoryValuation.items || []).slice(0, 100).map((itm: any) => (
                  <tr key={itm.productId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{itm.name}</td>
                    <td className="py-3 px-4 text-slate-500">{itm.company}</td>
                    <td className="py-3 px-4 font-semibold">{itm.availableStock}</td>
                    <td className="py-3 px-4">
                      {itm.buyingPrice !== null ? (
                        <span className="font-semibold text-slate-800">{formatTaka(itm.buyingPrice)}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Unknown Cost
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {itm.totalValuation !== null ? formatTaka(itm.totalValuation) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CAPITAL & PARTNER DOCUMENT MANAGEMENT SYSTEM */}
      {/* ========================================================================= */}
      {subTab === "capital-partners" && (
        <CapitalPartners onBackToAccounts={() => setSubTab("daily-ledger")} />
      )}

      {/* ========================================================================= */}
      {/* ADD PURCHASE MODAL */}
      {/* ========================================================================= */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>Record Product Purchase</span>
              </h3>
              <button onClick={() => setShowPurchaseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.target as any;
                const supplierName = form.supplierName.value;
                const invoiceReference = form.invoiceReference.value;
                const purchaseDate = form.purchaseDate.value;
                const totalAmount = parseFloat(form.totalAmount.value);
                const paidAmount = parseFloat(form.paidAmount.value || "0");
                const paymentMethod = form.paymentMethod.value;
                const notes = form.notes.value;

                try {
                  await accountsClient.createPurchase({
                    supplierName,
                    invoiceReference,
                    purchaseDate,
                    totalAmount,
                    paidAmount,
                    paymentMethod,
                    notes
                  });
                  showToast("Product purchase recorded successfully.");
                  setShowPurchaseModal(false);
                  loadAccountsData();
                } catch (err: any) {
                  showToast(err.message || "Failed to record purchase", true);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier / Manufacturer *</label>
                <input
                  name="supplierName"
                  required
                  placeholder="e.g. Square Pharmaceuticals Ltd."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    defaultValue={selectedDate}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier Ref / Invoice #</label>
                  <input
                    name="invoiceReference"
                    placeholder="e.g. SQ-98432"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Purchase (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="totalAmount"
                    required
                    placeholder="50000.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Paid Amount (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="paidAmount"
                    placeholder="0.00 (or full)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select name="paymentMethod" className="w-full px-3 py-2 border border-slate-200 rounded-xl">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit/Payable">Credit/Payable</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Optional procurement notes or batch details"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Save Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD COLLECTION MODAL */}
      {/* ========================================================================= */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span>Record Customer Collection</span>
              </h3>
              <button onClick={() => setShowCollectionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.target as any;
                const customerName = form.customerName.value;
                const collectionDate = form.collectionDate.value;
                const amount = parseFloat(form.amount.value);
                const paymentMethod = form.paymentMethod.value;
                const referenceInvoiceId = form.referenceInvoiceId.value;
                const notes = form.notes.value;

                try {
                  await accountsClient.createCollection({
                    customerName,
                    collectionDate,
                    amount,
                    paymentMethod,
                    referenceInvoiceId,
                    notes
                  });
                  showToast("Collection recorded successfully.");
                  setShowCollectionModal(false);
                  loadAccountsData();
                } catch (err: any) {
                  showToast(err.message || "Failed to record collection", true);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer / Pharmacy Name *</label>
                <input
                  name="customerName"
                  required
                  placeholder="e.g. Popular Pharma or Institutional Buyer"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Collection Date</label>
                  <input
                    type="date"
                    name="collectionDate"
                    defaultValue={selectedDate}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Collected Amount (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    placeholder="25000.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select name="paymentMethod" className="w-full px-3 py-2 border border-slate-200 rounded-xl">
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Related Invoice / Order #</label>
                  <input
                    name="referenceInvoiceId"
                    placeholder="e.g. MCH-4892 or INV-INST-..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea name="notes" rows={2} placeholder="Optional collection details" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCollectionModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                  Save Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD EXPENSE MODAL */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-600" />
                <span>Record Business Expense</span>
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.target as any;
                const category = form.category.value;
                const description = form.description.value;
                const amount = parseFloat(form.amount.value);
                const expenseDate = form.expenseDate.value;
                const paymentMethod = form.paymentMethod.value;
                const reference = form.reference.value;

                try {
                  await accountsClient.createExpense({
                    category,
                    description,
                    amount,
                    expenseDate,
                    paymentMethod,
                    reference
                  });
                  showToast("Expense recorded successfully.");
                  setShowExpenseModal(false);
                  loadAccountsData();
                } catch (err: any) {
                  showToast(err.message || "Failed to record expense", true);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Category *</label>
                  <select name="category" className="w-full px-3 py-2 border border-slate-200 rounded-xl">
                    <option value="Delivery">Delivery / Logistics</option>
                    <option value="Transport">Transport & Fuel</option>
                    <option value="Packaging">Packaging Materials</option>
                    <option value="Office">Office Supplies & Stationery</option>
                    <option value="Communication">Communication & Internet</option>
                    <option value="Software">Software & Cloud Services</option>
                    <option value="Marketing">Marketing & Promotions</option>
                    <option value="Salary/Wages">Salary / Wages</option>
                    <option value="Rent">Depot / Warehouse Rent</option>
                    <option value="Bank/Payment Fees">Bank / MFS Fees</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Date</label>
                  <input type="date" name="expenseDate" defaultValue={selectedDate} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <input name="description" required placeholder="e.g. Courier express charge or depot packaging poly" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (৳) *</label>
                  <input type="number" step="0.01" name="amount" required placeholder="500.00" className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select name="paymentMethod" className="w-full px-3 py-2 border border-slate-200 rounded-xl">
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Voucher / Receipt Reference</label>
                <input name="reference" placeholder="e.g. VOUCH-0091" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CAPITAL TRANSACTION MODAL */}
      {/* ========================================================================= */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-indigo-600" />
                <span>Capital Contribution / Withdrawal</span>
              </h3>
              <button onClick={() => setShowCapitalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <strong>Accounting Rule:</strong> Capital is equity, NOT revenue or business expense. It moves cash and capital balances without altering sales or profit.
            </p>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.target as any;
                const type = form.type.value;
                const partnerName = form.partnerName.value;
                const amount = parseFloat(form.amount.value);
                const transactionDate = form.transactionDate.value;
                const paymentMethod = form.paymentMethod.value;
                const notes = form.notes.value;

                try {
                  await accountsClient.createCapital({
                    type,
                    partnerName,
                    amount,
                    transactionDate,
                    paymentMethod,
                    notes
                  });
                  showToast("Capital transaction recorded.");
                  setShowCapitalModal(false);
                  loadAccountsData();
                } catch (err: any) {
                  showToast(err.message || "Failed to record capital transaction", true);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transaction Type *</label>
                  <select name="type" className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold">
                    <option value="Contribution">Contribution (Inflow +)</option>
                    <option value="Withdrawal">Withdrawal (Outflow -)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Partner / Owner Name *</label>
                  <input name="partnerName" required placeholder="Partner Name" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (৳) *</label>
                  <input type="number" step="0.01" name="amount" required placeholder="100000.00" className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transaction Date</label>
                  <input type="date" name="transactionDate" defaultValue={selectedDate} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select name="paymentMethod" className="w-full px-3 py-2 border border-slate-200 rounded-xl">
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="bKash">bKash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea name="notes" rows={2} placeholder="Optional details" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCapitalModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
                  Save Capital Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT DAY LEDGER RECORD MODAL */}
      {/* ========================================================================= */}
      {showEditDayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  <span>Edit Daily Business Ledger Record</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target Date: <strong className="text-indigo-900">{showEditDayModal.date} ({showEditDayModal.formattedDate})</strong>
                </p>
              </div>
              <button onClick={() => setShowEditDayModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {showEditDayModal.isOverridden && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-800">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This date currently has manual ledger overrides applied.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleResetRowOverride(showEditDayModal.date)}
                  className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Revert to Auto-Calculated</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveModalEdit} className="space-y-4 text-xs">
              {/* Live Preview Metric Badges */}
              {(() => {
                const modalSales = Number(modalEditFormData.deliveredSales) || 0;
                const modalCogs = Number(modalEditFormData.cogs) || 0;
                const modalGrossProfit = Math.round((modalSales - modalCogs) * 100) / 100;
                const modalDelivery = Number(modalEditFormData.deliveryExpenses) || 0;
                const modalOtherExp = Number(modalEditFormData.otherExpenses) || 0;
                const modalNetProfit = Math.round((modalGrossProfit - modalDelivery - modalOtherExp) * 100) / 100;
                const modalCashIn = Number(modalEditFormData.cashIn) || 0;
                const modalCashOut = Number(modalEditFormData.cashOut) || 0;
                const modalNetCashFlow = Math.round((modalCashIn - modalCashOut) * 100) / 100;

                return (
                  <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-900 text-white rounded-xl shadow-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Gross Profit (Live)</span>
                      <div className="text-sm font-black text-teal-300">{formatTaka(modalGrossProfit)}</div>
                      <p className="text-[9px] text-slate-400">Sales - COGS</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Net Profit (Live)</span>
                      <div className={`text-sm font-black ${modalNetProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatTaka(modalNetProfit)}
                      </div>
                      <p className="text-[9px] text-slate-400">GP - Delivery - Expenses</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Net Cash Flow</span>
                      <div className={`text-sm font-black ${modalNetCashFlow >= 0 ? "text-blue-300" : "text-rose-300"}`}>
                        {modalNetCashFlow >= 0 ? "+" : ""}{formatTaka(modalNetCashFlow)}
                      </div>
                      <p className="text-[9px] text-slate-400">Cash In - Cash Out</p>
                    </div>
                  </div>
                );
              })()}

              {/* SECTION 1: Sales, Delivery Revenue & COGS */}
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sales, Delivery Charge Revenue & COGS</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Delivered Sales (৳)
                      {showEditDayModal.rawCalculated?.deliveredSales !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.deliveredSales)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.deliveredSales}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, deliveredSales: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl font-mono text-xs font-bold text-indigo-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-800 mb-1 text-[11px]">
                      Delivery Charge (+) (৳)
                      {showEditDayModal.rawCalculated?.deliveryChargeCollected !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.deliveryChargeCollected)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.deliveryChargeCollected}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, deliveryChargeCollected: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 rounded-xl font-mono text-xs font-bold text-emerald-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Collected per invoice</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Cost of Goods Sold - COGS (৳)
                      {showEditDayModal.rawCalculated?.cogs !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.cogs)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.cogs}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, cogs: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl font-mono text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Purchases & Collections */}
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Procurement & Customer Collections</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Total Purchases (৳)
                      {showEditDayModal.rawCalculated?.purchases !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.purchases)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.purchases}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, purchases: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl font-mono text-xs font-bold text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Customer Collections (৳)
                      {showEditDayModal.rawCalculated?.customerCollections !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.customerCollections)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.customerCollections}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, customerCollections: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl font-mono text-xs font-bold text-blue-800"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Expenses */}
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                  <span>Transport, Delivery & Operating Expenses</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-amber-800 mb-1 text-[11px]">
                      Wholesaler Transport (-) (৳)
                      {showEditDayModal.rawCalculated?.transportExpenses !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.transportExpenses)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.transportExpenses}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, transportExpenses: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-amber-300 bg-amber-50 rounded-xl font-mono text-xs font-medium text-amber-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Wholesaler procurement transit</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Delivery Expenses (৳)
                      {showEditDayModal.rawCalculated?.deliveryExpenses !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.deliveryExpenses)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.deliveryExpenses}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, deliveryExpenses: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl font-mono text-xs font-medium text-orange-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Other Operating Expenses (৳)
                      {showEditDayModal.rawCalculated?.otherExpenses !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.otherExpenses)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.otherExpenses}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, otherExpenses: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl font-mono text-xs font-medium text-purple-800"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Real Cash Flow */}
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-blue-600" />
                  <span>Real Cash Flow Movements</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Total Cash In (৳)
                      {showEditDayModal.rawCalculated?.cashIn !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.cashIn)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.cashIn}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, cashIn: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl font-mono text-xs font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Total Cash Out (৳)
                      {showEditDayModal.rawCalculated?.cashOut !== undefined && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                          (Auto: {formatTaka(showEditDayModal.rawCalculated.cashOut)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={modalEditFormData.cashOut}
                      onChange={e => setModalEditFormData({ ...modalEditFormData, cashOut: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl font-mono text-xs font-bold text-rose-700"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Notes & Audit Trail */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Adjustment Reason & Notes</label>
                <textarea
                  rows={2}
                  value={modalEditFormData.notes}
                  onChange={e => setModalEditFormData({ ...modalEditFormData, notes: e.target.value })}
                  placeholder="e.g. Month-end audit reconciliation, stock recount adjustment, or manual cash tally correction"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {showEditDayModal.isOverridden ? (
                  <button
                    type="button"
                    onClick={() => handleResetRowOverride(showEditDayModal.date)}
                    disabled={isSavingRow}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Remove all manual overrides and restore auto-calculated order values"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Automatic</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditDayModal(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRow}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSavingRow ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{isSavingRow ? "Saving..." : "Save Day Record"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VOID CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Void Financial Entry</span>
              </h3>
              <button onClick={() => setShowVoidModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to void <strong>{showVoidModal.title}</strong>? In accordance with accounting compliance, financial entries are reversed with an audit reason rather than permanently deleted.
            </p>

            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1">Reason for Voiding *</label>
              <textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                required
                rows={2}
                placeholder="e.g. Duplicate entry, incorrect amount, or transaction cancelled"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
