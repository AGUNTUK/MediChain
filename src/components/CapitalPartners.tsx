import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Briefcase,
  Landmark,
  FileText,
  Receipt,
  Coins,
  Download,
  Printer,
  Eye,
  Pencil,
  Archive,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  History,
  X,
  FileCheck,
  BadgePercent,
  UserCheck,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles
} from "lucide-react";
import {
  Partner,
  PartnerType,
  PartnerStatus,
  CapitalLedgerEntry,
  CapitalDocument,
  CapitalDocumentType,
  CapitalDocumentStatus,
  CapitalDashboardStats
} from "../types";
import { capitalClient } from "../services/capitalPartnerService";

interface CapitalPartnersProps {
  initialSubTab?: "partners" | "documents" | "ledger";
  onBackToAccounts?: () => void;
}

export default function CapitalPartners({ initialSubTab = "partners", onBackToAccounts }: CapitalPartnersProps) {
  const [activeTab, setActiveTab] = useState<"partners" | "documents" | "ledger">(initialSubTab);

  // Data states
  const [stats, setStats] = useState<CapitalDashboardStats | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [documents, setDocuments] = useState<CapitalDocument[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partnerLedger, setPartnerLedger] = useState<{
    partner: Partner;
    entries: CapitalLedgerEntry[];
    closingBalance: number;
    totalContributions: number;
    totalWithdrawals: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Filters & Search
  const [partnerSearch, setPartnerSearch] = useState<string>("");
  const [partnerTypeFilter, setPartnerTypeFilter] = useState<string>("all");
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>("all");

  const [docSearch, setDocSearch] = useState<string>("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
  const [docStatusFilter, setDocStatusFilter] = useState<string>("all");
  const [docPartnerFilter, setDocPartnerFilter] = useState<string>("all");

  // Modals
  const [showPartnerModal, setShowPartnerModal] = useState<Partner | "new" | null>(null);
  const [showContributionModal, setShowContributionModal] = useState<{ partnerId?: string; isWithdrawal?: boolean } | null>(null);
  const [showGenerateDocModal, setShowGenerateDocModal] = useState<{ partnerId: string; txnId?: string; defaultType?: CapitalDocumentType } | null>(null);
  const [viewingDocument, setViewingDocument] = useState<CapitalDocument | null>(null);
  const [documentHistory, setDocumentHistory] = useState<CapitalDocument[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showVoidModal, setShowVoidModal] = useState<CapitalDocument | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");
  const [showCorrectionModal, setShowCorrectionModal] = useState<CapitalDocument | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Printable ref
  const printRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Initial load
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, partnersData, docsData] = await Promise.all([
        capitalClient.getOverview(),
        capitalClient.getPartners(),
        capitalClient.getDocuments()
      ]);
      setStats(statsData);
      setPartners(partnersData);
      setDocuments(docsData);
    } catch (err: any) {
      showToast(err.message || "Failed to load capital data", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load ledger when partner is selected
  const handleOpenPartnerLedger = async (partnerId: string) => {
    try {
      setSelectedPartnerId(partnerId);
      setActiveTab("ledger");
      setLoading(true);
      const ledger = await capitalClient.getPartnerLedger(partnerId);
      setPartnerLedger(ledger);
    } catch (err: any) {
      showToast(err.message || "Failed to load partner ledger", true);
    } finally {
      setLoading(false);
    }
  };

  // Refresh single ledger
  const refreshCurrentLedger = async (partnerId: string) => {
    try {
      const ledger = await capitalClient.getPartnerLedger(partnerId);
      setPartnerLedger(ledger);
      const updatedPartners = await capitalClient.getPartners();
      setPartners(updatedPartners);
    } catch {}
  };

  // Currency Formatter
  const formatTaka = (amount?: number) => {
    if (amount === undefined || amount === null) return "৳0";
    return `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Partner Filtered List
  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      if (partnerStatusFilter !== "all" && p.status !== partnerStatusFilter) return false;
      if (partnerTypeFilter !== "all" && p.partnerType !== partnerTypeFilter) return false;
      if (partnerSearch.trim()) {
        const q = partnerSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          (p.email && p.email.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [partners, partnerSearch, partnerTypeFilter, partnerStatusFilter]);

  // Document Filtered List
  const filteredDocuments = useMemo(() => {
    return documents.filter(d => {
      if (docTypeFilter !== "all" && d.documentType !== docTypeFilter) return false;
      if (docStatusFilter !== "all" && d.documentStatus !== docStatusFilter) return false;
      if (docPartnerFilter !== "all" && d.partnerId !== docPartnerFilter) return false;
      if (docSearch.trim()) {
        const q = docSearch.toLowerCase();
        return (
          d.documentNumber.toLowerCase().includes(q) ||
          d.partnerName.toLowerCase().includes(q) ||
          (d.documentPayload?.purpose && String(d.documentPayload.purpose).toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [documents, docSearch, docTypeFilter, docStatusFilter, docPartnerFilter]);

  // Handle View Document Details & History
  const handleOpenDocument = async (docId: string) => {
    try {
      setLoading(true);
      const { document: docData, history } = await capitalClient.getDocumentById(docId);
      setViewingDocument(docData);
      setDocumentHistory(history);
    } catch (err: any) {
      showToast(err.message || "Failed to load document", true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Document Finalize
  const handleFinalizeDocument = async (docId: string) => {
    try {
      setIsSubmitting(true);
      const finalized = await capitalClient.finalizeDocument(docId);
      setViewingDocument(finalized);
      showToast(`Document ${finalized.documentNumber} finalized and permanently locked!`);
      // Refresh list
      const docs = await capitalClient.getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      showToast(err.message || "Failed to finalize document", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Document Void
  const handleConfirmVoid = async () => {
    if (!showVoidModal || !voidReason.trim()) {
      showToast("Please provide a void reason for accounting audit", true);
      return;
    }
    try {
      setIsSubmitting(true);
      await capitalClient.voidDocument(showVoidModal.id, voidReason);
      showToast(`Document ${showVoidModal.documentNumber} marked as voided.`);
      setShowVoidModal(null);
      setVoidReason("");
      setViewingDocument(null);
      const docs = await capitalClient.getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      showToast(err.message || "Failed to void document", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Document Correction (New Version)
  const handleConfirmCorrection = async () => {
    if (!showCorrectionModal || !correctionReason.trim()) {
      showToast("Please provide a reason for creating a new corrected version", true);
      return;
    }
    try {
      setIsSubmitting(true);
      const newVersionDoc = await capitalClient.createNewVersion(
        showCorrectionModal.id,
        showCorrectionModal.documentPayload,
        correctionReason
      );
      showToast(`Created ${newVersionDoc.documentNumber} Version ${newVersionDoc.documentVersion}`);
      setShowCorrectionModal(null);
      setCorrectionReason("");
      setViewingDocument(newVersionDoc);
      const docs = await capitalClient.getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      showToast(err.message || "Failed to create new version", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print Document Window
  const handlePrintDocument = () => {
    if (!viewingDocument) return;
    window.print();
  };

  // Export Ledger as CSV
  const handleExportLedgerCsv = () => {
    if (!partnerLedger || !partnerLedger.entries.length) {
      showToast("No ledger entries to export", true);
      return;
    }
    const headers = "Date,Transaction ID,Reference,Type,Description,Contribution (BDT),Withdrawal (BDT),Adjustment (BDT),Balance (BDT),Payment Method,Status\n";
    const rows = partnerLedger.entries.map(e => 
      `"${e.date}","${e.transactionNumber}","${e.reference || ""}","${e.type}","${(e.description || "").replace(/"/g, '""')}",${e.contribution},${e.withdrawal},${e.adjustment},${e.balance},"${e.paymentMethod || ""}","${e.status}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `medichain_capital_ledger_${partnerLedger.partner.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Capital Ledger CSV downloaded.");
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold transition-all ${
            toastMessage.isError
              ? "bg-rose-900 text-rose-50 border border-rose-700"
              : "bg-slate-900 text-white border border-slate-700"
          }`}
        >
          {toastMessage.isError ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Capital & Partner Management</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Official Records
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  MediChain Equity, Investor Profiles, Cash Book Integration & Branded Business Documents
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {onBackToAccounts && (
              <button
                onClick={onBackToAccounts}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Back to Accounts</span>
              </button>
            )}

            <button
              onClick={() => setShowPartnerModal("new")}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Partner</span>
            </button>

            <button
              onClick={() => setShowContributionModal({})}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Record Contribution</span>
            </button>
          </div>
        </div>

        {/* TOP STATS CARDS */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Partners</span>
              <div className="text-lg font-black text-slate-900">{stats.totalPartners}</div>
              <p className="text-[9px] text-slate-400">Equity & loan investors</p>
            </div>

            <div className="bg-purple-50/60 border border-purple-200 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Net Capital</span>
              <div className="text-lg font-black text-purple-950">{formatTaka(stats.netPartnerCapital)}</div>
              <p className="text-[9px] text-purple-600">Total permanent equity</p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Cash Capital</span>
              <div className="text-lg font-black text-emerald-950">{formatTaka(stats.cashContributions)}</div>
              <p className="text-[9px] text-emerald-600">Credited to Cash In</p>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Bank Capital</span>
              <div className="text-lg font-black text-blue-950">{formatTaka(stats.bankContributions)}</div>
              <p className="text-[9px] text-blue-600">Bank accounts/transfers</p>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">This Month</span>
              <div className="text-lg font-black text-amber-950">+{formatTaka(stats.thisMonthContributions)}</div>
              <p className="text-[9px] text-amber-600">Monthly contributions</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saved Documents</span>
              <div className="text-lg font-black text-slate-900">{stats.totalSavedDocuments}</div>
              <p className="text-[9px] text-slate-400">Receipts & agreements</p>
            </div>
          </div>
        )}

        {/* IMPORTANT ACCOUNTING BANNER */}
        <div className="bg-purple-900 text-white rounded-xl p-3 px-4 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-lime-400 shrink-0" />
            <span className="font-semibold text-purple-100">
              <strong className="text-white">Authoritative Accounting Separation:</strong> Partner capital contributions directly credit Cash/Bank and Partner Equity. They are 100% excluded from Sales Revenue, COGS, and Operational Trading Profit.
            </span>
          </div>
          <span className="hidden md:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-purple-800 rounded border border-purple-700 text-purple-200">
            Compliant
          </span>
        </div>
      </div>

      {/* SUBTABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("partners")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "partners"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Partners & Investors ({partners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "documents"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Saved Documents ({documents.length})</span>
        </button>

        {selectedPartnerId && partnerLedger && (
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "ledger"
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Ledger: {partnerLedger.partner.name}</span>
          </button>
        )}
      </div>

      {/* TAB 1: PARTNERS DIRECTORY */}
      {activeTab === "partners" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search partner name, phone, or email..."
                value={partnerSearch}
                onChange={e => setPartnerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={partnerTypeFilter}
                onChange={e => setPartnerTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Partner Types</option>
                <option value="PARTNER_CAPITAL">Partner Capital</option>
                <option value="INVESTOR_CAPITAL">Investor Capital</option>
                <option value="PARTNER_LOAN">Partner Loan</option>
                <option value="BUSINESS_LOAN">Business Loan</option>
              </select>

              <select
                value={partnerStatusFilter}
                onChange={e => setPartnerStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-3">Partner Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Total Contributed</th>
                  <th className="py-3 px-3 text-purple-900 font-black">Capital Balance</th>
                  <th className="py-3 px-3">Ownership / Profit %</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No partners or investors found. Click "+ Add Partner" to create the first profile.
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map(partner => (
                    <tr key={partner.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{partner.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{partner.phone}</span>
                          {partner.email && <span>• {partner.email}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          partner.partnerType === "PARTNER_CAPITAL"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : partner.partnerType === "INVESTOR_CAPITAL"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {partner.partnerType.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-emerald-700">
                        {formatTaka(partner.totalContributed)}
                      </td>

                      <td className="py-3 px-3 font-black text-purple-950 text-sm">
                        {formatTaka(partner.currentCapitalBalance)}
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-semibold">{partner.ownershipPercentage}% Ownership</div>
                        <div className="text-[10px] text-slate-400">{partner.profitSharePercentage}% Profit Share</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          partner.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}>
                          {partner.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPartnerLedger(partner.id)}
                            className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors cursor-pointer"
                            title="View Capital Ledger"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setShowContributionModal({ partnerId: partner.id })}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                            title="Add Contribution"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setShowGenerateDocModal({ partnerId: partner.id })}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer"
                            title="Generate Document"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setShowPartnerModal(partner)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Edit Partner Profile"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PARTNER CAPITAL LEDGER */}
      {activeTab === "ledger" && partnerLedger && (
        <div className="space-y-4">
          {/* Partner Profile Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">{partnerLedger.partner.name}</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    {partnerLedger.partner.partnerType.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {partnerLedger.partner.phone}</span>
                  {partnerLedger.partner.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {partnerLedger.partner.email}</span>}
                  {partnerLedger.partner.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {partnerLedger.partner.address}</span>}
                  {partnerLedger.partner.nidReference && <span className="text-slate-400 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">NID: {partnerLedger.partner.nidReference}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportLedgerCsv}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => setShowContributionModal({ partnerId: partnerLedger.partner.id })}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Contribution</span>
                </button>

                <button
                  onClick={() => setShowContributionModal({ partnerId: partnerLedger.partner.id, isWithdrawal: true })}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Withdrawal</span>
                </button>
              </div>
            </div>

            {/* Financial Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Contributed</span>
                <div className="text-base font-black text-emerald-800">{formatTaka(partnerLedger.totalContributions)}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Withdrawn</span>
                <div className="text-base font-black text-rose-800">{formatTaka(partnerLedger.totalWithdrawals)}</div>
              </div>

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                <span className="text-[10px] font-bold text-purple-700 uppercase">Closing Balance</span>
                <div className="text-base font-black text-purple-950">{formatTaka(partnerLedger.closingBalance)}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Equity Stake</span>
                <div className="text-base font-black text-slate-900">{partnerLedger.partner.ownershipPercentage}% / {partnerLedger.partner.profitSharePercentage}%</div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs overflow-hidden space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Capital Ledger Transactions</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Transaction ID</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-emerald-700">Contribution (+)</th>
                    <th className="py-2.5 px-3 text-rose-700">Withdrawal (-)</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 font-black text-slate-900">Balance</th>
                    <th className="py-2.5 px-3 text-right">Documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {partnerLedger.entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No transactions recorded for this partner yet.
                      </td>
                    </tr>
                  ) : (
                    partnerLedger.entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{entry.date}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{entry.transactionNumber}</td>
                        <td className="py-2.5 px-3">{entry.description}</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700">
                          {entry.contribution > 0 ? `+${formatTaka(entry.contribution)}` : "-"}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-rose-700">
                          {entry.withdrawal > 0 ? `-${formatTaka(entry.withdrawal)}` : "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            {entry.paymentMethod || "Cash"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-900">
                          {formatTaka(entry.balance)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setShowGenerateDocModal({
                              partnerId: partnerLedger.partner.id,
                              txnId: entry.id,
                              defaultType: "CAPITAL_CONTRIBUTION_RECEIPT"
                            })}
                            className="p-1 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Receipt/Docs</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SAVED DOCUMENTS HUB */}
      {activeTab === "documents" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
          {/* Document Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search doc number, partner, purpose..."
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={docTypeFilter}
                onChange={e => setDocTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Document Types</option>
                <option value="CAPITAL_CONTRIBUTION_RECEIPT">Receipt</option>
                <option value="CASH_RECEIPT_VOUCHER">Cash Voucher</option>
                <option value="CAPITAL_CONTRIBUTION_CERTIFICATE">Certificate</option>
                <option value="PARTNER_CAPITAL_STATEMENT">Statement</option>
                <option value="PARTNER_CAPITAL_AGREEMENT">Agreement</option>
              </select>

              <select
                value={docStatusFilter}
                onChange={e => setDocStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="finalized">Finalized</option>
                <option value="draft">Draft</option>
                <option value="superseded">Superseded</option>
                <option value="voided">Voided</option>
              </select>

              <select
                value={docPartnerFilter}
                onChange={e => setDocPartnerFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Partners</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-3">Document Number</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Partner</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Version & Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No documents found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map(doc => {
                    const isFinal = doc.documentStatus === "finalized";
                    const isDraft = doc.documentStatus === "draft";
                    const isVoid = doc.documentStatus === "voided";
                    const isSuper = doc.documentStatus === "superseded";

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {doc.documentNumber}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-purple-900">
                            {doc.documentTitle}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-bold text-slate-900">
                          {doc.partnerName}
                        </td>

                        <td className="py-3 px-3 font-black text-slate-900">
                          {doc.documentPayload?.amount ? formatTaka(doc.documentPayload.amount) : "-"}
                        </td>

                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {doc.documentPayload?.date || doc.createdAt.slice(0, 10)}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFinal
                                ? "bg-emerald-100 text-emerald-800"
                                : isDraft
                                ? "bg-amber-100 text-amber-800"
                                : isSuper
                                ? "bg-slate-100 text-slate-600 line-through"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {doc.documentStatus.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              v{doc.documentVersion}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenDocument(doc.id)}
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors cursor-pointer"
                              title="View & Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={capitalClient.getPdfUrl(doc.id)}
                              download
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            {isFinal && (
                              <button
                                onClick={() => {
                                  setShowCorrectionModal(doc);
                                  setCorrectionReason("");
                                }}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                                title="Create Corrected Version"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {!isVoid && (
                              <button
                                onClick={() => {
                                  setShowVoidModal(doc);
                                  setVoidReason("");
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                                title="Void Document"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT PARTNER PROFILE */}
      {/* ========================================================================= */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                <span>{showPartnerModal === "new" ? "Add Partner Profile" : "Edit Partner Profile"}</span>
              </h3>
              <button onClick={() => setShowPartnerModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const payload: any = {
                  name: fd.get("name"),
                  phone: fd.get("phone"),
                  email: fd.get("email") || undefined,
                  address: fd.get("address") || undefined,
                  nidReference: fd.get("nidReference") || undefined,
                  partnerType: fd.get("partnerType"),
                  ownershipPercentage: parseFloat(fd.get("ownershipPercentage") as string) || 0,
                  profitSharePercentage: parseFloat(fd.get("profitSharePercentage") as string) || 0,
                  joiningDate: fd.get("joiningDate"),
                  notes: fd.get("notes") || undefined
                };

                try {
                  setIsSubmitting(true);
                  if (showPartnerModal === "new") {
                    await capitalClient.createPartner(payload);
                    showToast("Partner profile created successfully.");
                  } else {
                    await capitalClient.updatePartner(showPartnerModal.id, payload);
                    showToast("Partner profile updated.");
                  }
                  setShowPartnerModal(null);
                  loadDashboardData();
                } catch (err: any) {
                  showToast(err.message || "Failed to save partner", true);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={showPartnerModal !== "new" ? showPartnerModal.name : ""}
                  placeholder="e.g. Mr. Kazi Sohel / Investor Name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    defaultValue={showPartnerModal !== "new" ? showPartnerModal.phone : ""}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={showPartnerModal !== "new" ? showPartnerModal.email || "" : ""}
                    placeholder="partner@example.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Partner Type</label>
                  <select
                    name="partnerType"
                    defaultValue={showPartnerModal !== "new" ? showPartnerModal.partnerType : "PARTNER_CAPITAL"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold"
                  >
                    <option value="PARTNER_CAPITAL">Partner Capital (Equity)</option>
                    <option value="INVESTOR_CAPITAL">Investor Capital</option>
                    <option value="PARTNER_LOAN">Partner Loan</option>
                    <option value="BUSINESS_LOAN">Business Loan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    name="joiningDate"
                    defaultValue={showPartnerModal !== "new" ? showPartnerModal.joiningDate : new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ownership Share (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="ownershipPercentage"
                    defaultValue={showPartnerModal !== "new" ? showPartnerModal.ownershipPercentage : 0}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Profit Share (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="profitSharePercentage"
                    defaultValue={showPartnerModal !== "new" ? showPartnerModal.profitSharePercentage : 0}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={showPartnerModal !== "new" ? showPartnerModal.address || "" : ""}
                  placeholder="Business / Residential address"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">NID / ID Reference (Admin-Only)</label>
                <input
                  type="text"
                  name="nidReference"
                  defaultValue={showPartnerModal !== "new" ? showPartnerModal.nidReference || "" : ""}
                  placeholder="Optional reference number"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={showPartnerModal !== "new" ? showPartnerModal.notes || "" : ""}
                  placeholder="Terms, bank account notes, or documentation agreements"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD CAPITAL CONTRIBUTION / WITHDRAWAL */}
      {/* ========================================================================= */}
      {showContributionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <span>{showContributionModal.isWithdrawal ? "Record Capital Withdrawal" : "Record Capital Contribution"}</span>
              </h3>
              <button onClick={() => setShowContributionModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const partnerId = fd.get("partnerId") as string;
                const amount = parseFloat(fd.get("amount") as string);
                const paymentMethod = fd.get("paymentMethod") as any;
                const transactionDate = fd.get("transactionDate") as string;
                const purpose = fd.get("purpose") as string;
                const reference = fd.get("reference") as string;
                const notes = fd.get("notes") as string;

                try {
                  setIsSubmitting(true);
                  if (showContributionModal.isWithdrawal) {
                    await capitalClient.recordWithdrawal({
                      partnerId,
                      amount,
                      paymentMethod,
                      transactionDate,
                      purpose,
                      reference,
                      notes
                    });
                    showToast(`Capital withdrawal of ৳${amount} recorded.`);
                  } else {
                    const res = await capitalClient.recordContribution({
                      partnerId,
                      amount,
                      paymentMethod,
                      transactionDate,
                      purpose,
                      reference,
                      notes
                    });
                    showToast(`Capital contribution of ৳${amount} credited! Receipt generated.`);
                    if (res.documents && res.documents.length > 0) {
                      setViewingDocument(res.documents[0]);
                    }
                  }

                  setShowContributionModal(null);
                  loadDashboardData();
                  if (selectedPartnerId) refreshCurrentLedger(selectedPartnerId);
                } catch (err: any) {
                  showToast(err.message || "Failed to record transaction", true);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Partner *</label>
                <select
                  name="partnerId"
                  required
                  defaultValue={showContributionModal.partnerId || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold"
                >
                  <option value="" disabled>-- Select Contributor / Partner --</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount (৳ BDT) *</label>
                <input
                  type="number"
                  step="any"
                  name="amount"
                  required
                  placeholder="e.g. 100000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-bold text-base text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    name="paymentMethod"
                    defaultValue="Cash"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="transactionDate"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Purpose</label>
                <input
                  type="text"
                  name="purpose"
                  defaultValue={showContributionModal.isWithdrawal ? "Partner Capital Withdrawal" : "Partner Capital Contribution"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reference / Bank Slip No.</label>
                <input
                  type="text"
                  name="reference"
                  placeholder="e.g. SLIP-10294 or Bank deposit memo"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-2.5 text-[11px] text-purple-900 font-medium">
                ⚡ <strong>Accounting Rule:</strong> Automatically updates Cash/Bank and Partner Equity. Zero effect on sales, COGS, or profit.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowContributionModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  {isSubmitting ? "Recording..." : "Record & Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GENERATE DOCUMENT DRAFT */}
      {/* ========================================================================= */}
      {showGenerateDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                <span>Generate Branded Document</span>
              </h3>
              <button onClick={() => setShowGenerateDocModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const documentType = fd.get("documentType") as CapitalDocumentType;
                const partnerId = showGenerateDocModal.partnerId;
                const amount = parseFloat(fd.get("amount") as string) || 0;
                const paymentMethod = fd.get("paymentMethod") as string;
                const date = fd.get("date") as string;
                const purpose = fd.get("purpose") as string;

                try {
                  setIsSubmitting(true);
                  const draft = await capitalClient.createDocumentDraft({
                    documentType,
                    partnerId,
                    capitalTransactionId: showGenerateDocModal.txnId,
                    amount,
                    paymentMethod,
                    date,
                    purpose
                  });
                  showToast(`Document ${draft.documentNumber} generated as draft.`);
                  setShowGenerateDocModal(null);
                  setViewingDocument(draft);
                  const docs = await capitalClient.getDocuments();
                  setDocuments(docs);
                } catch (err: any) {
                  showToast(err.message || "Failed to generate document", true);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Document Type *</label>
                <select
                  name="documentType"
                  defaultValue={showGenerateDocModal.defaultType || "CAPITAL_CONTRIBUTION_RECEIPT"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold text-slate-900"
                >
                  <option value="CAPITAL_CONTRIBUTION_RECEIPT">1. Capital Contribution Receipt (MC-CAP-RCP-YYYY-XXXX)</option>
                  <option value="CASH_RECEIPT_VOUCHER">2. Cash Receipt Voucher (MC-CAP-VCH-YYYY-XXXX)</option>
                  <option value="CAPITAL_CONTRIBUTION_CERTIFICATE">3. Capital Contribution Certificate (MC-CAP-CERT-YYYY-XXXX)</option>
                  <option value="PARTNER_CAPITAL_STATEMENT">4. Partner Capital Statement (MC-CAP-STM-YYYY-XXXX)</option>
                  <option value="PARTNER_CAPITAL_AGREEMENT">5. Partner Capital Agreement (MC-CAP-AGR-YYYY-XXXX)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contribution / Transaction Amount (৳)</label>
                <input
                  type="number"
                  step="any"
                  name="amount"
                  placeholder="e.g. 100000"
                  defaultValue={100000}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select name="paymentMethod" defaultValue="Cash" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold">
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Purpose / Header Text</label>
                <input
                  type="text"
                  name="purpose"
                  defaultValue="Partner Capital Contribution"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGenerateDocModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  {isSubmitting ? "Generating..." : "Generate Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: BRANDED DOCUMENT VIEWER, PREVIEW & ACTIONS */}
      {/* ========================================================================= */}
      {viewingDocument && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-scale-in">
            {/* Modal Top Bar */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{viewingDocument.documentNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      viewingDocument.documentStatus === "finalized"
                        ? "bg-emerald-100 text-emerald-800"
                        : viewingDocument.documentStatus === "draft"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {viewingDocument.documentStatus.toUpperCase()} (v{viewingDocument.documentVersion})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">{viewingDocument.documentTitle}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {viewingDocument.documentStatus === "draft" && (
                  <button
                    onClick={() => handleFinalizeDocument(viewingDocument.id)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finalize & Lock</span>
                  </button>
                )}

                <button
                  onClick={handlePrintDocument}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                <a
                  href={capitalClient.getPdfUrl(viewingDocument.id)}
                  download
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>

                <button
                  onClick={() => setViewingDocument(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Render Area (A4 Styled Layout) */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white" ref={printRef}>
              {/* BRANDED HEADER */}
              <div className="flex items-start justify-between border-b-2 border-purple-600 pb-5">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="MediChain" className="w-12 h-12 object-contain" />
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">MediChain</h2>
                    <p className="text-xs font-bold text-purple-700">SMART PARTNER FOR PHARMACIES • ফার্মেসির স্মার্ট পার্টনার</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Shorear Tol, Rangpur Sadar, Rangpur, Bangladesh • support@medichainbd.com</p>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Official Document</div>
                  <div className="text-base font-black text-slate-900 font-mono">{viewingDocument.documentNumber}</div>
                  <div className="text-xs text-slate-500 font-medium">Date: {viewingDocument.documentPayload?.date || viewingDocument.createdAt.slice(0, 10)}</div>
                </div>
              </div>

              {/* DOCUMENT TITLE */}
              <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200/80">
                <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider">
                  {viewingDocument.documentTitle}
                </h3>
              </div>

              {/* BODY: RECEIPT / VOUCHER VIEW */}
              {(viewingDocument.documentType === "CAPITAL_CONTRIBUTION_RECEIPT" || viewingDocument.documentType === "CASH_RECEIPT_VOUCHER") && (
                <div className="space-y-5 text-xs">
                  {/* Grid of Details */}
                  <div className="grid grid-cols-2 gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Received From</span>
                      <p className="text-sm font-black text-slate-900">{viewingDocument.partnerName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</span>
                      <p className="text-sm font-bold text-slate-900">{viewingDocument.documentPayload?.paymentMethod || "Cash"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Purpose / Category</span>
                      <p className="font-semibold text-slate-800">{viewingDocument.documentPayload?.purpose || "Partner Capital Contribution"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Accounting Classification</span>
                      <p className="font-semibold text-purple-900">Partner Capital / Equity Account</p>
                    </div>
                  </div>

                  {/* Amount Box */}
                  <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-purple-700 uppercase">Amount Received</span>
                    <div className="text-2xl font-black text-purple-950 font-mono">
                      {formatTaka(viewingDocument.documentPayload?.amount)}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 italic">
                      In Words: {viewingDocument.documentPayload?.amountInWords}
                    </p>
                  </div>

                  {/* Voucher Double-Entry Notice if voucher */}
                  {viewingDocument.documentType === "CASH_RECEIPT_VOUCHER" && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                      <span className="font-bold text-slate-900">Double-Entry Accounting Record:</span>
                      <div className="grid grid-cols-2 gap-2 text-slate-600">
                        <div>• Debit (Cash In Hand): +{formatTaka(viewingDocument.documentPayload?.amount)}</div>
                        <div>• Credit (Partner Capital): +{formatTaka(viewingDocument.documentPayload?.amount)}</div>
                      </div>
                    </div>
                  )}

                  {/* Formal Statement */}
                  <div className="p-3.5 bg-slate-100/70 rounded-xl text-slate-600 text-[11px] text-center italic">
                    "Received from the above-named contributor as capital contribution to MediChain. This receipt is issued as a record of the capital contribution received by MediChain."
                  </div>
                </div>
              )}

              {/* BODY: CERTIFICATE VIEW */}
              {viewingDocument.documentType === "CAPITAL_CONTRIBUTION_CERTIFICATE" && (
                <div className="p-8 border-4 border-double border-purple-300 rounded-2xl bg-purple-50/20 text-center space-y-5">
                  <div className="text-purple-800 font-bold uppercase tracking-widest text-xs">
                    MediChain Capital Registry
                  </div>
                  <h4 className="text-xl font-serif font-black text-purple-950">
                    CERTIFICATE OF CAPITAL RECORD
                  </h4>
                  <p className="text-xs text-slate-600 max-w-lg mx-auto">
                    This is to certify that <strong>{viewingDocument.partnerName}</strong> has contributed{" "}
                    <strong>{formatTaka(viewingDocument.documentPayload?.amount)}</strong> (
                    <em>{viewingDocument.documentPayload?.amountInWords}</em>) to <strong>MediChain</strong> via{" "}
                    {viewingDocument.documentPayload?.paymentMethod || "Cash"} on{" "}
                    {viewingDocument.documentPayload?.date || "06 October 2026"}.
                  </p>
                  <div className="p-3 bg-white border border-purple-100 rounded-xl max-w-md mx-auto text-[11px] text-slate-500">
                    "This certificate records the contribution actually received and recorded in the MediChain partner capital records."
                  </div>
                </div>
              )}

              {/* BODY: STATEMENT VIEW */}
              {viewingDocument.documentType === "PARTNER_CAPITAL_STATEMENT" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400">PARTNER</span>
                      <p className="font-bold text-slate-900">{viewingDocument.partnerName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400">CLOSING CAPITAL</span>
                      <p className="font-black text-purple-900 text-sm">{formatTaka(viewingDocument.documentPayload?.closingBalance || viewingDocument.documentPayload?.amount)}</p>
                    </div>
                  </div>
                  <p className="text-slate-500 italic">Full transaction schedule is preserved in the official MediChain Ledger database.</p>
                </div>
              )}

              {/* BODY: AGREEMENT VIEW */}
              {viewingDocument.documentType === "PARTNER_CAPITAL_AGREEMENT" && (
                <div className="space-y-4 text-xs leading-relaxed text-slate-700 bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 uppercase">1. Purpose & Scope</h4>
                  <p>This agreement records partner capital contributed by {viewingDocument.partnerName} to MediChain in the amount of {formatTaka(viewingDocument.documentPayload?.amount)} ({viewingDocument.documentPayload?.amountInWords}).</p>

                  <h4 className="font-bold text-slate-900 uppercase">2. Ownership & Profit Share</h4>
                  <p>The partner holds a recognized ownership percentage of {viewingDocument.documentPayload?.ownershipPercentage || 0}% and profit share entitlement of {viewingDocument.documentPayload?.profitSharePercentage || 0}%.</p>

                  <h4 className="font-bold text-slate-900 uppercase">3. Capital Account Separation</h4>
                  <p>The capital amount is recorded solely in Partner Equity and Cash/Bank accounts, completely separate from operational sales revenue.</p>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 font-medium">
                    ⚠️ <strong>Notice:</strong> Template for business record purposes. Parties should obtain appropriate legal/accounting advice before relying on this agreement.
                  </div>
                </div>
              )}

              {/* DUAL SIGNATURE BOXES */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200">
                <div className="text-left space-y-1">
                  <div className="w-48 border-b border-slate-300 pb-1 font-bold text-xs text-slate-800">
                    {viewingDocument.partnerName}
                  </div>
                  <p className="text-[10px] text-slate-500">Contributor / Partner</p>
                </div>

                <div className="text-right space-y-1">
                  <div className="w-48 ml-auto border-b border-slate-300 pb-1 font-bold text-xs text-slate-800">
                    Kazi Sohel / Admin
                  </div>
                  <p className="text-[10px] text-slate-500">Received By / Authorized Representative</p>
                </div>
              </div>

              {/* FOOTER NOTICE */}
              <div className="text-center pt-4 text-[10px] text-slate-400 border-t border-slate-100">
                This document is issued as an internal record of partner capital for MediChain. Prepared for MediChain internal business records.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: VOID CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Void Capital Document</span>
              </h3>
              <button onClick={() => setShowVoidModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to void <strong>{showVoidModal.documentNumber}</strong>? In compliance with accounting audit standards, the document record remains in history with a void reason.
            </p>

            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1">Reason for Voiding *</label>
              <textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                required
                rows={2}
                placeholder="e.g. Corrected document re-issued, typographical error, or replaced by agreement"
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
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isSubmitting ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CREATE CORRECTED VERSION MODAL */}
      {/* ========================================================================= */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-purple-900 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <span>Create Corrected Version</span>
              </h3>
              <button onClick={() => setShowCorrectionModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Create Version {showCorrectionModal.documentVersion + 1} of <strong>{showCorrectionModal.documentNumber}</strong>. The existing version will be preserved and marked as <em>Superseded</em>.
            </p>

            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1">Reason for Correction *</label>
              <textarea
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                required
                rows={2}
                placeholder="e.g. Corrected partner bank reference or updated profit share terms"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCorrection}
                disabled={isSubmitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isSubmitting ? "Creating..." : `Create Version ${showCorrectionModal.documentVersion + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
