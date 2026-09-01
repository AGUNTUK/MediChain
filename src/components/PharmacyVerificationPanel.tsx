import React, { useState, useEffect } from "react";
import { 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  FileText, 
  Phone, 
  MapPin, 
  Calendar, 
  CircleDollarSign, 
  Eye, 
  Sparkles, 
  RefreshCw, 
  X,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  User,
  CreditCard,
  Lock,
  Download
} from "lucide-react";
import { Pharmacy } from "../types";

interface PharmacyVerificationPanelProps {
  pharmacies: Pharmacy[];
  onPharmacyUpdated?: () => void;
}

interface PharmacyDocumentsState {
  loading: boolean;
  error: string;
  documents: {
    drugLicense?: { path: string | null; url: string | null };
    tradeLicense?: { path: string | null; url: string | null };
    proprietorNid?: { path: string | null; url: string | null };
  } | null;
}

export default function PharmacyVerificationPanel({
  pharmacies,
  onPharmacyUpdated
}: PharmacyVerificationPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Verified" | "Suspended">("All");
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [docsState, setDocsState] = useState<PharmacyDocumentsState>({
    loading: false,
    error: "",
    documents: null
  });

  const checkStatus = (p: Pharmacy) => {
    const st = (p.verificationStatus || (p as any).status || "").toString().toLowerCase();
    const isVerified = st === "approved" || st === "verified";
    const isSuspended = st === "suspended" || st === "rejected";
    const isPending = !isVerified && !isSuspended;
    return { isVerified, isSuspended, isPending, st };
  };

  const filteredPharmacies = pharmacies.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.pharmacyName.toLowerCase().includes(q) ||
      p.ownerName.toLowerCase().includes(q) ||
      (p.licenseNo && p.licenseNo.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q));

    const { isVerified, isSuspended, isPending } = checkStatus(p);

    const matchesStatus =
      statusFilter === "All"
        ? true
        : statusFilter === "Pending"
        ? isPending
        : statusFilter === "Verified"
        ? isVerified
        : isSuspended;

    return matchesSearch && matchesStatus;
  });

  // Fetch signed URLs when a pharmacy is inspected
  useEffect(() => {
    if (!selectedPharmacy) {
      setDocsState({ loading: false, error: "", documents: null });
      return;
    }

    let isMounted = true;
    setDocsState({ loading: true, error: "", documents: null });

    const fetchDocuments = async () => {
      try {
        const res = await fetch(`/api/admin/pharmacies/${selectedPharmacy.id}/documents`);
        if (!res.ok) {
          throw new Error("Failed to load secure document signed URLs.");
        }
        const data = await res.json();
        if (isMounted) {
          setDocsState({
            loading: false,
            error: "",
            documents: data.documents || null
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setDocsState({
            loading: false,
            error: err.message || "Failed to load verification documents.",
            documents: null
          });
        }
      }
    };

    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [selectedPharmacy]);

  const handleUpdateStatus = async (pharmacyId: string, status: "Verified" | "Suspended" | "Pending") => {
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const endpoint = status === "Verified" ? "approve" : status === "Suspended" ? "suspend" : "status";
      const res = await fetch(`/api/admin/pharmacies/${pharmacyId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reason: rejectionReason,
          rejectionReason
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update pharmacy verification status.");
      }

      setActionSuccess(`Pharmacy account status updated to ${status}.`);
      setSelectedPharmacy(null);
      setRejectionReason("");
      if (onPharmacyUpdated) {
        onPharmacyUpdated();
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to update pharmacy status.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight">Pharmacy Compliance & Verification Hub</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Validate DGDA drug license credentials, trade licenses, and proprietor NIDs across Bangladesh.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/10">
            <span className="block text-xs text-slate-300">Pending Review</span>
            <span className="text-lg font-bold text-amber-400">
              {pharmacies.filter((p) => checkStatus(p).isPending).length}
            </span>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/10">
            <span className="block text-xs text-slate-300">Verified Partners</span>
            <span className="text-lg font-bold text-emerald-400">
              {pharmacies.filter((p) => checkStatus(p).isVerified).length}
            </span>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/10">
            <span className="block text-xs text-slate-300">Suspended</span>
            <span className="text-lg font-bold text-rose-400">
              {pharmacies.filter((p) => checkStatus(p).isSuspended).length}
            </span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess("")} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError("")} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Pharmacy Name, Owner or License #..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {(["All", "Pending", "Verified", "Suspended"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? "bg-teal-700 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "Pending" ? "Pending Approval" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Pharmacy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPharmacies.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No pharmacies found matching your filter.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          filteredPharmacies.map((pharm, idx) => {
            const { isVerified, isSuspended, isPending } = checkStatus(pharm);

            return (
              <div
                key={pharm.id || `pharm-${idx}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{pharm.pharmacyName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {pharm.ownerName || "Proprietor"}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        isVerified
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : isPending
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {isVerified ? "Verified" : isPending ? "Pending DGDA" : "Suspended"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Drug License:</span>
                      <span className="font-mono font-semibold text-slate-800">{pharm.licenseNo || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Contact Mobile:</span>
                      <span className="font-semibold text-slate-800">{pharm.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Address / City:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {pharm.address || pharm.city || "Dhaka"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedPharmacy(pharm);
                    }}
                    className="flex-1 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    Inspect Credentials
                  </button>

                  {isPending && (
                    <button
                      onClick={() => handleUpdateStatus(pharm.id, "Verified")}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Quick Approve"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Verification Inspection Modal */}
      {selectedPharmacy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base">{selectedPharmacy.pharmacyName}</h3>
                </div>
                <p className="text-xs text-teal-200 mt-0.5">DGDA Compliance & Legal Document Verification</p>
              </div>
              <button
                onClick={() => setSelectedPharmacy(null)}
                className="text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Proprietor Name</span>
                  <span className="font-bold text-slate-850 text-sm">{selectedPharmacy.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">DGDA License No</span>
                  <span className="font-mono font-bold text-teal-800 text-sm">{selectedPharmacy.licenseNo || "Pending"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Trade License No</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">{selectedPharmacy.tradeLicenseNo || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Contact Phone</span>
                  <span className="font-semibold text-slate-800">{selectedPharmacy.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">National ID (NID)</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">{selectedPharmacy.nidNumber || "Not Provided"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Current Status</span>
                  <span className={`font-bold uppercase tracking-wider text-[11px] ${
                    checkStatus(selectedPharmacy).isVerified ? "text-emerald-700" : checkStatus(selectedPharmacy).isPending ? "text-amber-700" : "text-rose-700"
                  }`}>
                    {selectedPharmacy.verificationStatus || selectedPharmacy.status || "Pending"}
                  </span>
                </div>
                <div className="col-span-full border-t border-slate-200/60 pt-2 mt-1">
                  <span className="text-slate-400 block text-[11px] font-medium">Registered Address</span>
                  <span className="font-medium text-slate-700">{selectedPharmacy.address || `${selectedPharmacy.city || "Dhaka"}, Bangladesh`}</span>
                </div>
              </div>

              {/* Private Verification Documents Attachments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-teal-600" />
                    Private Storage Attachments (verification-documents)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Protected by Authenticated Signed URLs</span>
                </div>

                {docsState.loading ? (
                  <div className="py-6 text-center bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
                    <span className="text-xs text-slate-600 font-medium">Generating secure signed preview links...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Drug License */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-teal-800 font-bold mb-1">
                          <FileCheck className="w-4 h-4 text-teal-600" />
                          <span>Drug License</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Official DGDA Retail/Wholesale Scan</p>
                      </div>

                      {docsState.documents?.drugLicense?.url ? (
                        <div className="space-y-2">
                          <a
                            href={docsState.documents.drugLicense.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Document
                            <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-medium">No document attached</span>
                      )}
                    </div>

                    {/* Trade License */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-teal-800 font-bold mb-1">
                          <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                          <span>Trade License</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Municipal Trade Certification</p>
                      </div>

                      {docsState.documents?.tradeLicense?.url ? (
                        <div className="space-y-2">
                          <a
                            href={docsState.documents.tradeLicense.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Document
                            <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-medium">No document attached</span>
                      )}
                    </div>

                    {/* Proprietor NID */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-teal-800 font-bold mb-1">
                          <User className="w-4 h-4 text-teal-600" />
                          <span>Proprietor NID</span>
                        </div>
                        <p className="text-[10px] text-slate-500">National ID Card / Smart Card</p>
                      </div>

                      {docsState.documents?.proprietorNid?.url ? (
                        <div className="space-y-2">
                          <a
                            href={docsState.documents.proprietorNid.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Document
                            <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-medium">No document attached</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Action Notes */}
              {selectedPharmacy.status !== "Suspended" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rejection or Suspension Reason (Optional)</label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide reason if rejecting or suspending this pharmacy..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedPharmacy(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium cursor-pointer transition-colors"
              >
                Close
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(selectedPharmacy.id, "Suspended")}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject / Suspend
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(selectedPharmacy.id, "Verified")}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
