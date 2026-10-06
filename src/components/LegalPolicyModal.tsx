import React, { useState } from "react";
import { X, ShieldCheck, FileText, RefreshCw, AlertCircle } from "lucide-react";

export type LegalPolicyTab = "privacy" | "terms" | "refund" | "compliance";

interface LegalPolicyModalProps {
  isOpen?: boolean;
  isStandalone?: boolean;
  initialTab?: LegalPolicyTab;
  onClose: () => void;
}

export default function LegalPolicyModal({
  isOpen = true,
  isStandalone = false,
  initialTab = "privacy",
  onClose
}: LegalPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<LegalPolicyTab>(initialTab);

  if (!isOpen && !isStandalone) return null;

  return (
    <div
      className={
        isStandalone
          ? "min-h-screen bg-slate-50 p-4 sm:p-6 max-w-4xl mx-auto"
          : "fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      }
    >
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center border border-purple-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">DGDA Regulatory & Legal Policies</h2>
              <p className="text-xs text-slate-500">MediChain B2B Pharmacy Compliance (DGDA & BMA)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-4 gap-2 overflow-x-auto text-xs font-semibold bg-white">
          <button
            onClick={() => setActiveTab("privacy")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "privacy"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab("terms")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "terms"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Terms of Service
          </button>
          <button
            onClick={() => setActiveTab("refund")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "refund"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Returns & Refunds
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "compliance"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" /> DGDA Compliance
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-4">
          {activeTab === "privacy" && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-800">1. Data Collection & HIPAA/DGDA Privacy Policy</h3>
              <p>
                MediChain collects pharmacy trade licenses, DGDA drug licenses, proprietor identification (NID), and transactional order histories strictly for verification under Bangladesh Drug Rules 1946 and the National Drug Policy.
              </p>
              <p>
                Proprietor identity and verification records are stored using encrypted private storage buckets. No personal contact or licensing data is ever leased, sold, or shared with third-party advertisers.
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                <strong>Data Retention:</strong> Order records and electronic invoices are archived for a minimum of 3 years to comply with DGDA statutory audit protocols.
              </div>
            </div>
          )}

          {activeTab === "terms" && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-800">2. Wholesale Procurement Terms of Service</h3>
              <p>
                Procurement accounts are strictly restricted to licensed pharmacies, hospitals, and clinics holding valid and active Drug Licenses issued by the Directorate General of Drug Administration (DGDA), Bangladesh.
              </p>
              <p>
                Wholesale prices and trade bonuses are proprietary commercial terms between verified distributors and pharmacies. Submitting fraudulent licenses or attempting procurement without authorization constitutes a criminal violation under the Drugs Act.
              </p>
            </div>
          )}

          {activeTab === "refund" && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-800">3. Return, Inspection & Cold-Chain Policy</h3>
              <p>
                <strong>24-Hour Inspection Window:</strong> Broken packaging, tampered seals, or short-shipments must be recorded and notified to depot dispatch within 24 hours of delivery.
              </p>
              <p>
                <strong>Cold-Chain Biologicals (2°C–8°C):</strong> Due to strict temperature control protocols, insulin, vaccines, and biologics cannot be returned once handed over and accepted, unless an immediate temperature excursion was verified upon delivery.
              </p>
              <p>
                <strong>Batch Recalls:</strong> Any medicine subject to an official DGDA batch recall is granted immediate 100% credit reimbursement and depot collection.
              </p>
            </div>
          )}

          {activeTab === "compliance" && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-800">4. DGDA Verification & Anti-Counterfeit Policy</h3>
              <p>
                All pharmaceutical items distributed via MediChain are procured exclusively from verified manufacturers (Square, Beximco, Incepta, Renata, ACME, etc.) with verified batch numbers and expiration dates.
              </p>
              <p>
                Every invoice carries traceable batch serialization numbers, ensuring complete provenance and compliance with the DGDA anti-counterfeiting mandate.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-brand-purple hover:bg-purple-700 rounded-xl transition-colors"
          >
            I Understand & Close
          </button>
        </div>
      </div>
    </div>
  );
}
